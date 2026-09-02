"""
Day 5, Part E, Steps 10/11: controlled experiment testing whether adding
ban information improves rolling forward-patch prediction, holding
everything else fixed (same model, same folds, same dataset, same
metrics) versus the champion-role-only baseline.

Bans are extracted directly from the raw Match-V5 JSON already on disk --
no new collection needed. A champion-id -> name lookup is built from the
participants already present in that same raw data (self-contained, no
external Data Dragon dependency). Missing bans (a team not using all 5,
~4.3% of slots observed) are encoded as the literal string "NONE" rather
than dropped, since "chose not to ban" is itself real pre-game information
and OneHotEncoder handles it like any other category.
"""

from __future__ import annotations

import json
import logging

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from evaluate import compute_metrics
from temporal_eval import build_rolling_windows
from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, DATA_DIR, RANDOM_STATE, load_dataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("train_bans_experiment")

RAW_DIR = DATA_DIR / "raw"
OUTPUT_PATH = ARTIFACTS_DIR / "day5_bans_experiment.json"

FIXED_CONFIG = {"C": 0.01, "min_frequency": 50}  # unchanged from Day 3, same as Day 3.5/4
BAN_COLUMNS = [f"blue_ban_{i+1}" for i in range(5)] + [f"red_ban_{i+1}" for i in range(5)]


def build_champion_id_to_name() -> dict[int, str]:
    """Self-contained: built from participant data already in our raw
    files, no external Data Dragon dependency."""
    id_to_name: dict[int, str] = {}
    for path in RAW_DIR.glob("*.json"):
        match = json.loads(path.read_text())
        for p in match["info"]["participants"]:
            id_to_name[p["championId"]] = p["championName"]
        if len(id_to_name) >= 200:  # champion roster is ~180-ish; stop early once stable
            break
    log.info("champion_id_to_name_built n_champions=%d", len(id_to_name))
    return id_to_name


def extract_bans_for_match(match: dict, id_to_name: dict[int, str]) -> dict | None:
    teams = {t["teamId"]: t["bans"] for t in match["info"]["teams"]}
    if 100 not in teams or 200 not in teams:
        return None

    def resolve(bans: list[dict]) -> list[str]:
        sorted_bans = sorted(bans, key=lambda b: b["pickTurn"])
        return [id_to_name.get(b["championId"], "NONE") if b["championId"] > 0 else "NONE" for b in sorted_bans]

    blue_bans = resolve(teams[100])
    red_bans = resolve(teams[200])
    if len(blue_bans) != 5 or len(red_bans) != 5:
        return None

    row = {"match_id": match["metadata"]["matchId"]}
    for i, champ in enumerate(blue_bans):
        row[f"blue_ban_{i+1}"] = champ
    for i, champ in enumerate(red_bans):
        row[f"red_ban_{i+1}"] = champ
    return row


def build_bans_dataframe(match_ids: set[str], id_to_name: dict[int, str]) -> pd.DataFrame:
    rows = []
    skipped = 0
    for match_id in match_ids:
        path = RAW_DIR / f"{match_id}.json"
        if not path.exists():
            skipped += 1
            continue
        match = json.loads(path.read_text())
        row = extract_bans_for_match(match, id_to_name)
        if row is None:
            skipped += 1
            continue
        rows.append(row)
    log.info("bans_extracted matches=%d skipped=%d", len(rows), skipped)
    return pd.DataFrame(rows)


def build_preprocessor(columns: list[str]) -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=True, min_frequency=FIXED_CONFIG["min_frequency"]), columns)]
    )


def build_pipeline(columns: list[str]) -> Pipeline:
    return Pipeline([
        ("preprocessing", build_preprocessor(columns)),
        ("classifier", LogisticRegression(C=FIXED_CONFIG["C"], solver="lbfgs", max_iter=1000, random_state=RANDOM_STATE)),
    ])


def fit_predict_evaluate(train_df: pd.DataFrame, test_df: pd.DataFrame, columns: list[str], name: str) -> dict:
    X_train, y_train = train_df[columns], train_df["blue_win"].astype(int)
    X_test, y_test = test_df[columns], test_df["blue_win"].astype(int)
    pipeline = build_pipeline(columns)
    pipeline.fit(X_train, y_train)
    proba = pipeline.predict_proba(X_test)[:, 1]
    return compute_metrics(y_test, pd.Series(proba), name)


def run_bans_experiment() -> None:
    df = load_dataset()
    id_to_name = build_champion_id_to_name()
    bans_df = build_bans_dataframe(set(df["match_id"]), id_to_name)

    merged = df.merge(bans_df, on="match_id", how="inner")
    log.info("merged_dataset rows=%d (original=%d, lost_to_missing_ban_data=%d)", len(merged), len(df), len(df) - len(merged))

    windows = build_rolling_windows(merged)
    baseline_columns = CHAMPION_COLUMNS
    experiment_columns = CHAMPION_COLUMNS + BAN_COLUMNS

    fold_results = []
    for train_patches, test_patch in windows:
        train_df = merged[merged["patch"].isin(train_patches)]
        test_df = merged[merged["patch"] == test_patch]
        assert set(train_df["match_id"]).isdisjoint(set(test_df["match_id"]))

        baseline_metrics = fit_predict_evaluate(train_df, test_df, baseline_columns, "champion_role_only")
        experiment_metrics = fit_predict_evaluate(train_df, test_df, experiment_columns, "champion_role_plus_bans")

        fold_results.append({
            "train_through": train_patches[-1], "test_patch": test_patch, "test_rows": len(test_df),
            "baseline": baseline_metrics, "experiment": experiment_metrics,
            "roc_auc_delta": experiment_metrics["roc_auc"] - baseline_metrics["roc_auc"],
            "log_loss_delta": baseline_metrics["log_loss"] - experiment_metrics["log_loss"],
        })
        log.info(
            "fold train_through=%s test=%s baseline_roc_auc=%.4f +bans_roc_auc=%.4f delta=%+.4f baseline_ll=%.4f +bans_ll=%.4f ll_delta=%+.4f",
            train_patches[-1], test_patch, baseline_metrics["roc_auc"], experiment_metrics["roc_auc"],
            experiment_metrics["roc_auc"] - baseline_metrics["roc_auc"],
            baseline_metrics["log_loss"], experiment_metrics["log_loss"],
            baseline_metrics["log_loss"] - experiment_metrics["log_loss"],
        )

    mean_roc_auc_delta = sum(f["roc_auc_delta"] for f in fold_results) / len(fold_results)
    mean_log_loss_delta = sum(f["log_loss_delta"] for f in fold_results) / len(fold_results)
    wins = sum(1 for f in fold_results if f["roc_auc_delta"] > 0)
    log.info("bans_experiment_summary n_folds=%d wins=%d/%d mean_roc_auc_delta=%+.4f mean_log_loss_delta=%+.4f",
              len(fold_results), wins, len(fold_results), mean_roc_auc_delta, mean_log_loss_delta)

    OUTPUT_PATH.write_text(json.dumps({
        "fixed_config": FIXED_CONFIG,
        "merged_dataset_rows": len(merged),
        "rows_lost_to_missing_ban_data": len(df) - len(merged),
        "baseline_columns": baseline_columns, "experiment_columns": experiment_columns,
        "folds": fold_results,
        "summary": {"n_folds": len(fold_results), "roc_auc_wins": wins, "mean_roc_auc_delta": mean_roc_auc_delta, "mean_log_loss_delta": mean_log_loss_delta},
    }, indent=2, default=str))
    log.info("bans_experiment_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    run_bans_experiment()

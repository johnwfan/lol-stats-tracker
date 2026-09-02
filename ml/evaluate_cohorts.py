"""
Day 5, Part C, Steps 6/7/8: evaluates draft-only predictability separately
per skill-tier cohort, using the exact fixed model from Day 3
(C=0.01, min_frequency=50) -- never retuned per cohort, per the user's
explicit instruction.

Evaluation protocol per cohort is decided from its actual patch coverage,
not assumed in advance: rolling forward-patch evaluation (Day 3.5's
method) if the cohort spans enough same-sized patches, otherwise a
chronological (by game_creation timestamp, not random) train-early/
test-late split as the best available fallback -- and that fallback is
stated plainly as a limitation, not disguised as equivalent to rolling
evaluation.

IMPORTANT CAVEAT (found empirically, not assumed): cohorts collected
today can span an entirely different, non-overlapping patch range from
the main Master+ dataset (sub-apex players' recent-100-games history
stretches across more calendar time). Cross-cohort ROC-AUC comparisons
are therefore confounded with patch/meta differences, not a clean
isolated skill-tier comparison -- flagged explicitly in the output,
not hidden.
"""

from __future__ import annotations

import json
import logging

import pandas as pd

from evaluate import compute_metrics
from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, RANDOM_STATE, build_logreg_pipeline, load_dataset, patch_sort_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("evaluate_cohorts")

DATA_DIR = ARTIFACTS_DIR.parent / "data"
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_PATH = ARTIFACTS_DIR / "day5_cohort_evaluation.json"

FIXED_CONFIG = {"C": 0.01, "min_frequency": 50}  # unchanged from Day 3 -- never retuned per cohort
MIN_ROWS_TO_EVALUATE = 500  # below this, results are too noisy to report meaningfully
MIN_TEST_PATCH_ROWS = 150  # scaled down from the main dataset's 1000 given cohorts are much smaller by design


def load_cohort(name: str) -> pd.DataFrame | None:
    if name == "master_plus":
        return load_dataset()
    path = PROCESSED_DIR / f"cohort_{name}.parquet"
    if not path.exists():
        return None
    return pd.read_parquet(path)


def check_min_frequency_sanity(train_df: pd.DataFrame) -> dict:
    """Does min_frequency=50 leave a sane feature set at this cohort's
    size, or does it collapse almost everything into the 'infrequent'
    bucket? Reported, not silently adjusted."""
    long_counts = pd.concat([train_df[c].value_counts() for c in CHAMPION_COLUMNS])
    total_categories = len(long_counts)
    below_threshold = int((long_counts < FIXED_CONFIG["min_frequency"]).sum())
    pct_below = round(100 * below_threshold / total_categories, 1) if total_categories else None
    flagged = pct_below is not None and pct_below > 70
    if flagged:
        log.warning("min_frequency_sanity_check FLAGGED: %.1f%% of champion-role categories fall below min_frequency=%d in this cohort's training data -- most feature identity is being collapsed into the infrequent bucket", pct_below, FIXED_CONFIG["min_frequency"])
    return {"total_categories": total_categories, "pct_below_min_frequency": pct_below, "flagged": flagged}


def build_rolling_windows_for_cohort(df: pd.DataFrame, min_test_rows: int) -> list[tuple[list[str], str]]:
    patches = sorted(df["patch"].unique(), key=patch_sort_key)
    counts = df["patch"].value_counts()
    windows = []
    for i, test_patch in enumerate(patches):
        if counts[test_patch] < min_test_rows:
            continue
        train_patches = patches[:i]
        if not train_patches:
            continue
        windows.append((train_patches, test_patch))
    return windows


def evaluate_fold(train_df: pd.DataFrame, test_df: pd.DataFrame, name: str) -> dict:
    X_train, y_train = train_df[CHAMPION_COLUMNS], train_df["blue_win"].astype(int)
    X_test, y_test = test_df[CHAMPION_COLUMNS], test_df["blue_win"].astype(int)
    pipeline = build_logreg_pipeline(**FIXED_CONFIG)
    pipeline.fit(X_train, y_train)
    proba = pipeline.predict_proba(X_test)[:, 1]
    metrics = compute_metrics(y_test, pd.Series(proba), name)
    metrics["proba_std"] = float(proba.std())
    return metrics


def evaluate_cohort(name: str, df: pd.DataFrame) -> dict:
    patch_counts = df["patch"].value_counts().sort_index(key=lambda s: s.map(patch_sort_key)).to_dict()
    n_patches_with_enough_rows = sum(1 for c in patch_counts.values() if c >= MIN_TEST_PATCH_ROWS)
    log.info("cohort=%s total_rows=%d patches=%s", name, len(df), patch_counts)

    result = {"cohort": name, "total_rows": len(df), "patch_distribution": patch_counts}

    if len(df) < MIN_ROWS_TO_EVALUATE:
        result["status"] = "insufficient_data"
        log.warning("cohort=%s status=insufficient_data (total_rows=%d < %d)", name, len(df), MIN_ROWS_TO_EVALUATE)
        return result

    windows = build_rolling_windows_for_cohort(df, MIN_TEST_PATCH_ROWS)

    if len(windows) >= 2:
        result["evaluation_method"] = "rolling_forward_patch"
        fold_results = []
        for train_patches, test_patch in windows:
            train_df = df[df["patch"].isin(train_patches)]
            test_df = df[df["patch"] == test_patch]
            sanity = check_min_frequency_sanity(train_df)
            metrics = evaluate_fold(train_df, test_df, f"{name}_{test_patch}")
            fold_results.append({"train_through": train_patches[-1], "test_patch": test_patch, "train_rows": len(train_df), "test_rows": len(test_df), "min_frequency_sanity": sanity, **metrics})
            log.info("cohort=%s fold train_through=%s test=%s roc_auc=%.4f log_loss=%.4f", name, train_patches[-1], test_patch, metrics["roc_auc"], metrics["log_loss"])
        result["folds"] = fold_results
        roc_aucs = [f["roc_auc"] for f in fold_results]
        log_losses = [f["log_loss"] for f in fold_results]
        result["summary"] = {
            "n_folds": len(fold_results),
            "mean_roc_auc": float(pd.Series(roc_aucs).mean()), "std_roc_auc": float(pd.Series(roc_aucs).std()),
            "mean_log_loss": float(pd.Series(log_losses).mean()), "std_log_loss": float(pd.Series(log_losses).std()),
        }
    else:
        result["evaluation_method"] = "chronological_fallback_single_split"
        result["evaluation_limitation"] = (
            f"cohort spans too few large-enough patches ({n_patches_with_enough_rows} with >={MIN_TEST_PATCH_ROWS} rows) "
            "for rolling forward-patch evaluation -- falling back to a single chronological "
            "(by game_creation timestamp) 80/20 train/test split as the best available alternative. "
            "This is NOT equivalent to rolling evaluation and should be read with more caution."
        )
        log.warning("cohort=%s %s", name, result["evaluation_limitation"])
        if "game_creation" not in df.columns:
            result["status"] = "no_timestamp_available"
            return result
        df_sorted = df.sort_values("game_creation")
        split_idx = int(len(df_sorted) * 0.8)
        train_df, test_df = df_sorted.iloc[:split_idx], df_sorted.iloc[split_idx:]
        sanity = check_min_frequency_sanity(train_df)
        metrics = evaluate_fold(train_df, test_df, name)
        result["min_frequency_sanity"] = sanity
        result["train_rows"] = len(train_df)
        result["test_rows"] = len(test_df)
        result["summary"] = {"mean_roc_auc": metrics["roc_auc"], "mean_log_loss": metrics["log_loss"], "note": "single split, no std across folds available"}
        result["metrics"] = metrics

    return result


def evaluate_all_cohorts() -> None:
    cohort_names = ["gold", "platinum", "emerald", "diamond", "master_plus"]
    results = {}
    for name in cohort_names:
        df = load_cohort(name)
        if df is None or len(df) == 0:
            results[name] = {"cohort": name, "status": "not_yet_collected"}
            log.info("cohort=%s status=not_yet_collected", name)
            continue
        results[name] = evaluate_cohort(name, df)

    log.info("=" * 100)
    log.info("%-12s %10s %14s %14s", "Cohort", "Rows", "Mean ROC-AUC", "Mean LogLoss")
    for name, r in results.items():
        summary = r.get("summary", {})
        log.info("%-12s %10s %14s %14s", name, r.get("total_rows", "-"),
                  f"{summary.get('mean_roc_auc', float('nan')):.4f}" if summary else "-",
                  f"{summary.get('mean_log_loss', float('nan')):.4f}" if summary else "-")
    log.info("=" * 100)
    log.info("CAVEAT: cohorts may span non-overlapping patch ranges -- cross-cohort comparisons are confounded with patch/meta differences, not isolated skill-tier effects. See per-cohort patch_distribution.")

    OUTPUT_PATH.write_text(json.dumps({"fixed_config": FIXED_CONFIG, "cohorts": results}, indent=2, default=str))
    log.info("cohort_evaluation_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    evaluate_all_cohorts()

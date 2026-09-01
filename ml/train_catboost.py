"""
Day 4, Steps 6/7/8: rolling forward-patch evaluation of CatBoost against
the fixed Day 3 logistic-regression benchmark, using the exact same folds
Day 3.5 established.

CatBoost gets champion-role columns as native categoricals (no one-hot --
see build_rolling_windows/CHAMPION_COLUMNS reuse from train.py/temporal_eval.py).
`patch` is excluded as a feature for the same reason it was excluded from
logistic regression: every fold's test patch is, by construction, never
seen in training, so a patch feature would be a novel category at test
time on every single fold.

Hyperparameter selection (Step 8) uses only folds 1-4 (16.12->13 through
16.15->16); the newest fold (16.16->17) is held out from tuning entirely,
mirroring Day 3's rule of never tuning on the true final holdout.
"""

from __future__ import annotations

import json
import logging

import joblib
import pandas as pd
from catboost import CatBoostClassifier

from evaluate import compute_metrics
from temporal_eval import build_rolling_windows
from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, RANDOM_STATE, load_dataset, patch_sort_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("train_catboost")

# depth x l2_leaf_reg grid at a fixed conservative learning rate; early
# stopping picks the effective tree count per fit rather than also
# grid-searching iterations.
LEARNING_RATE = 0.05
CAT_GRID = [(depth, l2) for depth in (4, 6, 8) for l2 in (3, 10)]
TIE_BREAK_MARGIN = 0.002  # if configs are this close on log loss, prefer the more conservative one

GRID_RESULTS_PATH = ARTIFACTS_DIR / "day4_catboost_hyperparameter_grid.json"
ROLLING_EVAL_PATH = ARTIFACTS_DIR / "day4_catboost_rolling_eval.json"
ROLLING_PREDICTIONS_PATH = ARTIFACTS_DIR / "day4_catboost_rolling_predictions.parquet"
MODEL_PATH = ARTIFACTS_DIR / "day4_catboost_model.joblib"


def make_model(depth: int, l2_leaf_reg: float) -> CatBoostClassifier:
    return CatBoostClassifier(
        depth=depth,
        l2_leaf_reg=l2_leaf_reg,
        learning_rate=LEARNING_RATE,
        iterations=1000,
        loss_function="Logloss",
        eval_metric="Logloss",
        early_stopping_rounds=50,
        random_seed=RANDOM_STATE,
        cat_features=CHAMPION_COLUMNS,
        verbose=False,
    )


def chronological_holdout_split(train_df: pd.DataFrame, holdout_frac: float = 0.15) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Carves an early-stopping validation slice off the *end* of the
    training patches (never the test patch) -- patches are already
    chronological, so this stays within-training-period, matching the
    same 'no future information' rule as the outer rolling split."""
    patches = sorted(train_df["patch"].unique(), key=patch_sort_key)
    n_holdout = max(1, int(len(train_df) * holdout_frac))
    # take rows from the most recent training patch(es) until n_holdout is reached
    holdout_parts = []
    remaining = n_holdout
    for patch in reversed(patches):
        patch_rows = train_df[train_df["patch"] == patch]
        if remaining <= 0:
            break
        take = patch_rows.iloc[-remaining:] if len(patch_rows) > remaining else patch_rows
        holdout_parts.append(take)
        remaining -= len(take)
    holdout_df = pd.concat(holdout_parts)
    fit_df = train_df.drop(holdout_df.index)
    return fit_df, holdout_df


def fit_predict_evaluate_catboost(train_df: pd.DataFrame, test_df: pd.DataFrame, depth: int, l2_leaf_reg: float) -> tuple[dict, dict, pd.Series]:
    fit_df, holdout_df = chronological_holdout_split(train_df)

    X_fit, y_fit = fit_df[CHAMPION_COLUMNS], fit_df["blue_win"].astype(int)
    X_holdout, y_holdout = holdout_df[CHAMPION_COLUMNS], holdout_df["blue_win"].astype(int)
    X_test, y_test = test_df[CHAMPION_COLUMNS], test_df["blue_win"].astype(int)

    model = make_model(depth, l2_leaf_reg)
    model.fit(X_fit, y_fit, eval_set=(X_holdout, y_holdout))

    test_proba = pd.Series(model.predict_proba(X_test)[:, 1], index=test_df.index)
    test_metrics = compute_metrics(y_test, test_proba, f"catboost_d{depth}_l2{l2_leaf_reg}")
    test_metrics["proba_min"] = float(test_proba.min())
    test_metrics["proba_max"] = float(test_proba.max())
    test_metrics["proba_std"] = float(test_proba.std())
    test_metrics["best_iteration"] = int(model.get_best_iteration() or model.tree_count_)

    train_proba = pd.Series(model.predict_proba(pd.concat([X_fit, X_holdout]))[:, 1])
    train_metrics = compute_metrics(pd.concat([y_fit, y_holdout]), train_proba, f"catboost_d{depth}_l2{l2_leaf_reg}_train")

    return test_metrics, train_metrics, test_proba


def run_grid_search(df: pd.DataFrame, windows: list[tuple[list[str], str]]) -> tuple[int, float]:
    tuning_folds = windows[:4]  # everything except the newest (16.16->17) fold
    grid_results = []

    for depth, l2 in CAT_GRID:
        fold_metrics = []
        for train_patches, test_patch in tuning_folds:
            train_df = df[df["patch"].isin(train_patches)]
            test_df = df[df["patch"] == test_patch]
            metrics, _, _ = fit_predict_evaluate_catboost(train_df, test_df, depth, l2)
            fold_metrics.append(metrics)

        mean_log_loss = sum(m["log_loss"] for m in fold_metrics) / len(fold_metrics)
        mean_roc_auc = sum(m["roc_auc"] for m in fold_metrics) / len(fold_metrics)
        grid_results.append({"depth": depth, "l2_leaf_reg": l2, "mean_log_loss": mean_log_loss, "mean_roc_auc": mean_roc_auc, "fold_metrics": fold_metrics})
        log.info("grid_config depth=%d l2_leaf_reg=%.1f mean_log_loss=%.4f mean_roc_auc=%.4f", depth, l2, mean_log_loss, mean_roc_auc)

    grid_results.sort(key=lambda r: r["mean_log_loss"])
    best = grid_results[0]
    # tie-break: among configs within TIE_BREAK_MARGIN of the best log loss, prefer shallower depth, then higher l2
    close = [r for r in grid_results if r["mean_log_loss"] - best["mean_log_loss"] <= TIE_BREAK_MARGIN]
    close.sort(key=lambda r: (r["depth"], -r["l2_leaf_reg"]))
    winner = close[0]

    log.info("grid_winner depth=%d l2_leaf_reg=%.1f mean_log_loss=%.4f (tie_break_applied=%s)",
              winner["depth"], winner["l2_leaf_reg"], winner["mean_log_loss"], winner != grid_results[0])

    GRID_RESULTS_PATH.write_text(json.dumps({
        "grid": CAT_GRID, "learning_rate": LEARNING_RATE, "tie_break_margin": TIE_BREAK_MARGIN,
        "tuning_folds": [{"train_through": w[0][-1], "test_patch": w[1]} for w in tuning_folds],
        "all_configs": grid_results, "winner": {"depth": winner["depth"], "l2_leaf_reg": winner["l2_leaf_reg"]},
    }, indent=2, default=str))
    log.info("grid_results_saved path=%s", GRID_RESULTS_PATH)

    return winner["depth"], winner["l2_leaf_reg"]


def train_catboost() -> None:
    df = load_dataset()
    windows = build_rolling_windows(df)
    log.info("rolling_windows=%s", [(w[0][-1] if w[0] else None, "->", w[1]) for w in windows])

    best_depth, best_l2 = run_grid_search(df, windows)

    rolling_results = []
    all_predictions = []
    final_model = None
    for train_patches, test_patch in windows:
        train_df = df[df["patch"].isin(train_patches)]
        test_df = df[df["patch"] == test_patch]
        assert set(train_df["match_id"]).isdisjoint(set(test_df["match_id"]))

        test_metrics, train_metrics, test_proba = fit_predict_evaluate_catboost(train_df, test_df, best_depth, best_l2)
        rolling_results.append({
            "train_through": train_patches[-1], "train_patches": train_patches, "train_rows": len(train_df),
            "test_patch": test_patch, "test_rows": len(test_df),
            "test_metrics": test_metrics, "train_metrics": train_metrics,
            "train_test_roc_auc_gap": train_metrics["roc_auc"] - test_metrics["roc_auc"],
        })
        log.info(
            "final_fold train_through=%s test=%s test_roc_auc=%.4f train_roc_auc=%.4f gap=%.4f test_log_loss=%.4f",
            train_patches[-1], test_patch, test_metrics["roc_auc"], train_metrics["roc_auc"],
            train_metrics["roc_auc"] - test_metrics["roc_auc"], test_metrics["log_loss"],
        )

        pred_df = test_df[["match_id", "patch", "blue_win"]].copy()
        pred_df["pred_proba"] = test_proba.values
        all_predictions.append(pred_df)

        if test_patch == windows[-1][1]:  # fit on the fullest training pool for the saved model artifact
            fit_df, holdout_df = chronological_holdout_split(train_df)
            final_model = make_model(best_depth, best_l2)
            final_model.fit(fit_df[CHAMPION_COLUMNS], fit_df["blue_win"].astype(int),
                             eval_set=(holdout_df[CHAMPION_COLUMNS], holdout_df["blue_win"].astype(int)))

    roc_aucs = [r["test_metrics"]["roc_auc"] for r in rolling_results]
    log_losses = [r["test_metrics"]["log_loss"] for r in rolling_results]
    summary = {
        "n_folds": len(rolling_results),
        "mean_roc_auc": sum(roc_aucs) / len(roc_aucs),
        "std_roc_auc": pd.Series(roc_aucs).std(),
        "mean_log_loss": sum(log_losses) / len(log_losses),
        "std_log_loss": pd.Series(log_losses).std(),
        "mean_train_test_roc_auc_gap": sum(r["train_test_roc_auc_gap"] for r in rolling_results) / len(rolling_results),
    }
    log.info("rolling_summary mean_roc_auc=%.4f std_roc_auc=%.4f mean_log_loss=%.4f mean_train_test_gap=%.4f",
              summary["mean_roc_auc"], summary["std_roc_auc"], summary["mean_log_loss"], summary["mean_train_test_roc_auc_gap"])

    ROLLING_EVAL_PATH.write_text(json.dumps({
        "best_config": {"depth": best_depth, "l2_leaf_reg": best_l2, "learning_rate": LEARNING_RATE},
        "folds": rolling_results, "summary": summary,
    }, indent=2, default=str))
    log.info("rolling_eval_saved path=%s", ROLLING_EVAL_PATH)

    predictions = pd.concat(all_predictions, ignore_index=True)
    predictions.to_parquet(ROLLING_PREDICTIONS_PATH, index=False)
    log.info("rolling_predictions_saved path=%s", ROLLING_PREDICTIONS_PATH)

    joblib.dump(final_model, MODEL_PATH)
    log.info("model_saved path=%s", MODEL_PATH)


if __name__ == "__main__":
    train_catboost()

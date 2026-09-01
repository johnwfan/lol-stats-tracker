"""
Day 4, Steps 9/10/11/12/13/16: full comparison of constant baseline vs.
Day 3's fixed logistic-regression benchmark vs. CatBoost, on the identical
Day 3.5 rolling folds.

Reads Day 3.5's already-computed logistic numbers rather than refitting --
guarantees identical folds/config between the two models by construction.
"""

from __future__ import annotations

import json
import logging

import matplotlib
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve

from evaluate import compute_metrics
from temporal_eval import build_rolling_windows
from train import ARTIFACTS_DIR, RANDOM_STATE, load_dataset, patch_sort_key

matplotlib.use("Agg")
import matplotlib.pyplot as plt

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("evaluate_day4")

DAY3_5_ROLLING_PATH = ARTIFACTS_DIR / "day3_5_rolling_forward_eval.json"
DAY4_ROLLING_PATH = ARTIFACTS_DIR / "day4_catboost_rolling_eval.json"
DAY4_PREDICTIONS_PATH = ARTIFACTS_DIR / "day4_catboost_rolling_predictions.parquet"
DAY3_5_PREDICTIONS_PATH = ARTIFACTS_DIR / "day3_5_rolling_predictions.parquet"

METRICS_PATH = ARTIFACTS_DIR / "day4_metrics.json"
CALIBRATION_PLOT_PATH = ARTIFACTS_DIR / "day4_calibration_comparison.png"


def compute_constant_baseline_per_fold(df: pd.DataFrame, windows: list[tuple[list[str], str]]) -> list[dict]:
    """Fresh per-fold constant baseline (predicts the training window's
    blue-win rate for every test row) -- computed on the same folds as
    the other two models for full 3-way consistency."""
    results = []
    for train_patches, test_patch in windows:
        train_df = df[df["patch"].isin(train_patches)]
        test_df = df[df["patch"] == test_patch]
        constant_pred = train_df["blue_win"].mean()
        proba = pd.Series(constant_pred, index=test_df.index)
        metrics = compute_metrics(test_df["blue_win"].astype(int), proba, "constant_baseline")
        results.append({"train_through": train_patches[-1], "test_patch": test_patch, "test_rows": len(test_df), **metrics})
    return results


def summarize(fold_metrics: list[dict]) -> dict:
    roc_aucs = [f["roc_auc"] for f in fold_metrics]
    log_losses = [f["log_loss"] for f in fold_metrics]
    briers = [f["brier_score"] for f in fold_metrics]
    accs = [f["accuracy"] for f in fold_metrics]
    return {
        "mean_roc_auc": float(np.mean(roc_aucs)), "std_roc_auc": float(np.std(roc_aucs)),
        "mean_log_loss": float(np.mean(log_losses)), "std_log_loss": float(np.std(log_losses)),
        "mean_brier": float(np.mean(briers)), "std_brier": float(np.std(briers)),
        "mean_accuracy": float(np.mean(accs)), "std_accuracy": float(np.std(accs)),
    }


def consistency_analysis(logistic_folds: list[dict], catboost_folds: list[dict]) -> dict:
    """Per-fold win/loss on both ROC-AUC (higher better) and log loss
    (lower better) -- separately, since a model can win on one and lose
    on the other."""
    per_fold = []
    for lg, cb in zip(logistic_folds, catboost_folds):
        assert lg["test_patch"] == cb["test_patch"]
        roc_delta = cb["roc_auc"] - lg["roc_auc"]
        log_loss_delta = lg["log_loss"] - cb["log_loss"]  # positive = catboost better (lower loss)
        per_fold.append({
            "test_patch": cb["test_patch"],
            "logistic_roc_auc": lg["roc_auc"], "catboost_roc_auc": cb["roc_auc"], "roc_auc_delta": roc_delta,
            "logistic_log_loss": lg["log_loss"], "catboost_log_loss": cb["log_loss"], "log_loss_delta": log_loss_delta,
            "catboost_wins_roc_auc": roc_delta > 0, "catboost_wins_log_loss": log_loss_delta > 0,
        })

    roc_wins = sum(1 for f in per_fold if f["catboost_wins_roc_auc"])
    log_loss_wins = sum(1 for f in per_fold if f["catboost_wins_log_loss"])
    roc_deltas = [f["roc_auc_delta"] for f in per_fold]

    return {
        "per_fold": per_fold,
        "n_folds": len(per_fold),
        "roc_auc_wins": roc_wins, "roc_auc_losses": len(per_fold) - roc_wins,
        "log_loss_wins": log_loss_wins, "log_loss_losses": len(per_fold) - log_loss_wins,
        "mean_roc_auc_delta": float(np.mean(roc_deltas)), "std_roc_auc_delta": float(np.std(roc_deltas)),
        "max_single_fold_roc_auc_delta": float(max(roc_deltas)),
        "verdict_note": (
            "if roc_auc_wins is a minority of folds but mean_roc_auc_delta is positive, "
            "the average is likely driven by one favorable fold -- check max_single_fold_roc_auc_delta "
            "against the other folds' deltas before calling this a consistent improvement"
        ),
    }


def prediction_distribution(proba: pd.Series) -> dict:
    return {
        "min": float(proba.min()), "max": float(proba.max()), "mean": float(proba.mean()), "std": float(proba.std()),
        "p5": float(proba.quantile(0.05)), "p25": float(proba.quantile(0.25)), "p50": float(proba.quantile(0.50)),
        "p75": float(proba.quantile(0.75)), "p95": float(proba.quantile(0.95)),
    }


def plot_calibration_comparison(baseline_pred, logistic_pred, catboost_pred, path) -> None:
    fig, ax = plt.subplots(figsize=(7, 7))
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfectly calibrated")

    series = [(baseline_pred, "Constant baseline", "s", "tab:blue"), (logistic_pred, "Logistic (C=0.01)", "^", "tab:orange"), (catboost_pred, "CatBoost", "o", "tab:red")]
    for (y_true, proba), label, marker, color in [(s[0], s[1], s[2], s[3]) for s in series]:
        try:
            prob_true, prob_pred = calibration_curve(y_true, proba, n_bins=10, strategy="quantile")
            ax.plot(prob_pred, prob_true, marker=marker, color=color, label=label)
        except ValueError:
            ax.scatter([proba.mean()], [y_true.mean()], marker=marker, color=color, label=f"{label} (near-constant)")

    ax.set_xlabel("Mean predicted probability")
    ax.set_ylabel("Observed win rate")
    ax.set_title("Day 4: calibration across all rolling folds (aggregated)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    log.info("calibration_plot_saved path=%s", path)


def evaluate_day4() -> None:
    df = load_dataset()
    windows = build_rolling_windows(df)

    day3_5 = json.loads(DAY3_5_ROLLING_PATH.read_text())
    logistic_folds = day3_5["folds"]

    day4 = json.loads(DAY4_ROLLING_PATH.read_text())
    catboost_folds_raw = day4["folds"]
    catboost_folds = [{"test_patch": f["test_patch"], **f["test_metrics"]} for f in catboost_folds_raw]

    baseline_folds = compute_constant_baseline_per_fold(df, windows)

    baseline_summary = summarize(baseline_folds)
    logistic_summary = summarize(logistic_folds)
    catboost_summary = summarize(catboost_folds)

    log.info("=" * 100)
    log.info("%-22s %12s %12s %12s %12s", "Model", "Avg ROC-AUC", "Avg LogLoss", "Avg Brier", "Avg Accuracy")
    for name, s in [("Constant", baseline_summary), ("Logistic Regression", logistic_summary), ("CatBoost", catboost_summary)]:
        log.info("%-22s %12.4f %12.4f %12.4f %12.4f", name, s["mean_roc_auc"], s["mean_log_loss"], s["mean_brier"], s["mean_accuracy"])
    log.info("=" * 100)

    consistency = consistency_analysis(logistic_folds, catboost_folds)
    log.info(
        "consistency roc_auc_wins=%d/%d log_loss_wins=%d/%d mean_roc_auc_delta=%+.4f max_single_fold_delta=%+.4f",
        consistency["roc_auc_wins"], consistency["n_folds"], consistency["log_loss_wins"], consistency["n_folds"],
        consistency["mean_roc_auc_delta"], consistency["max_single_fold_roc_auc_delta"],
    )
    for f in consistency["per_fold"]:
        log.info(
            "  patch=%s logistic_roc_auc=%.4f catboost_roc_auc=%.4f delta=%+.4f logistic_ll=%.4f catboost_ll=%.4f ll_delta=%+.4f",
            f["test_patch"], f["logistic_roc_auc"], f["catboost_roc_auc"], f["roc_auc_delta"],
            f["logistic_log_loss"], f["catboost_log_loss"], f["log_loss_delta"],
        )

    logistic_predictions = pd.read_parquet(DAY3_5_PREDICTIONS_PATH)
    catboost_predictions = pd.read_parquet(DAY4_PREDICTIONS_PATH)
    assert set(logistic_predictions["match_id"]) == set(catboost_predictions["match_id"]), "logistic and catboost rolling predictions cover different matches"

    logistic_dist = prediction_distribution(logistic_predictions["pred_proba"])
    catboost_dist = prediction_distribution(catboost_predictions["pred_proba"])
    log.info("logistic_prediction_distribution %s", logistic_dist)
    log.info("catboost_prediction_distribution %s", catboost_dist)

    baseline_all_proba = pd.concat([
        pd.Series(df[df["patch"].isin(tp)]["blue_win"].mean(), index=df[df["patch"] == te].index)
        for tp, te in windows
    ])
    baseline_y_true = df.loc[baseline_all_proba.index, "blue_win"].astype(int)
    plot_calibration_comparison(
        (baseline_y_true, baseline_all_proba),
        (logistic_predictions["blue_win"].astype(int), logistic_predictions["pred_proba"]),
        (catboost_predictions["blue_win"].astype(int), catboost_predictions["pred_proba"]),
        CALIBRATION_PLOT_PATH,
    )

    # Step 16 overfitting check, read straight from train_catboost.py's stored train-vs-test gaps
    overfitting_folds = [{"test_patch": f["test_patch"], "train_roc_auc": f["train_metrics"]["roc_auc"], "test_roc_auc": f["test_metrics"]["roc_auc"], "gap": f["train_test_roc_auc_gap"]} for f in catboost_folds_raw]
    mean_gap = float(np.mean([f["gap"] for f in overfitting_folds]))
    log.info("overfitting_check mean_train_test_roc_auc_gap=%.4f (catboost best config: depth=%s l2_leaf_reg=%s)",
              mean_gap, day4["best_config"]["depth"], day4["best_config"]["l2_leaf_reg"])

    report = {
        "rolling_windows": [{"train_through": w[0][-1], "test_patch": w[1]} for w in windows],
        "comparison_table": {"constant_baseline": baseline_summary, "logistic_regression": logistic_summary, "catboost": catboost_summary},
        "per_fold": {"constant_baseline": baseline_folds, "logistic_regression": logistic_folds, "catboost": catboost_folds},
        "consistency_analysis": consistency,
        "prediction_distributions": {"logistic_regression": logistic_dist, "catboost": catboost_dist},
        "overfitting_check": {"catboost_config": day4["best_config"], "mean_train_test_roc_auc_gap": mean_gap, "per_fold": overfitting_folds},
    }
    METRICS_PATH.write_text(json.dumps(report, indent=2, default=str))
    log.info("day4_metrics_saved path=%s", METRICS_PATH)


if __name__ == "__main__":
    evaluate_day4()

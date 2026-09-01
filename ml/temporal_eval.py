"""
Day 3.5, Steps 3/4/5/8: rolling forward-patch evaluation.

For each sufficiently large patch N, fits the SAME fixed logistic regression
configuration (carried over unchanged from Day 3's best-tuned config) on all
patches strictly before N, and evaluates on N. This isolates "does the
training window's time range matter" from "does the hyperparameter choice
matter" -- hyperparameters are never re-tuned per fold here.

Also runs cross-validation *within* each training window (same config) to
compare against the actual next-patch result, and reuses those same
per-fold predictions to check calibration separately on each held-out patch.
"""

from __future__ import annotations

import json
import logging

import matplotlib
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.model_selection import StratifiedKFold, cross_validate

from evaluate import compute_metrics
from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, RANDOM_STATE, build_logreg_pipeline, load_dataset, patch_sort_key

matplotlib.use("Agg")
import matplotlib.pyplot as plt

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("temporal_eval")

# Carried over unchanged from artifacts/day3_training_config.json's
# Experiment C (Day 3's best-tuned config) -- deliberately not re-derived
# here, so this experiment measures training-window effects in isolation.
FIXED_CONFIG = {"C": 0.01, "min_frequency": 50}

MIN_TEST_PATCH_ROWS = 1000  # 16.10/16.11/16.12 are far below this -- excluded as test targets

ROLLING_EVAL_PATH = ARTIFACTS_DIR / "day3_5_rolling_forward_eval.json"
CV_VS_FUTURE_PATH = ARTIFACTS_DIR / "day3_5_cv_vs_future_gap.json"
ROLLING_PREDICTIONS_PATH = ARTIFACTS_DIR / "day3_5_rolling_predictions.parquet"
CALIBRATION_BY_PATCH_PATH = ARTIFACTS_DIR / "day3_5_calibration_by_patch.png"
EXPERIMENT_CONFIG_PATH = ARTIFACTS_DIR / "day3_5_experiment_config.json"


def build_rolling_windows(df: pd.DataFrame) -> list[tuple[list[str], str]]:
    """(train_patches, test_patch) pairs: train on every patch strictly
    before the test patch, test patches restricted to those with enough
    rows to give a meaningful metric."""
    patches = sorted(df["patch"].unique(), key=patch_sort_key)
    counts = df["patch"].value_counts()

    windows = []
    for i, test_patch in enumerate(patches):
        if counts[test_patch] < MIN_TEST_PATCH_ROWS:
            continue
        train_patches = patches[:i]
        if not train_patches:
            continue
        windows.append((train_patches, test_patch))
    return windows


def fit_predict_evaluate(train_df: pd.DataFrame, test_df: pd.DataFrame) -> tuple[dict, np.ndarray]:
    X_train, y_train = train_df[CHAMPION_COLUMNS], train_df["blue_win"].astype(int)
    X_test, y_test = test_df[CHAMPION_COLUMNS], test_df["blue_win"].astype(int)

    pipeline = build_logreg_pipeline(**FIXED_CONFIG)
    pipeline.fit(X_train, y_train)
    proba = pipeline.predict_proba(X_test)[:, 1]

    metrics = compute_metrics(y_test, pd.Series(proba), "rolling_fold")
    metrics["proba_min"] = float(proba.min())
    metrics["proba_max"] = float(proba.max())
    metrics["proba_std"] = float(proba.std())
    return metrics, proba


def cv_score_on_training_window(train_df: pd.DataFrame) -> dict:
    X_train, y_train = train_df[CHAMPION_COLUMNS], train_df["blue_win"].astype(int)
    pipeline = build_logreg_pipeline(**FIXED_CONFIG)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    scores = cross_validate(pipeline, X_train, y_train, cv=cv, scoring=["roc_auc", "neg_log_loss", "neg_brier_score"])
    return {
        "cv_roc_auc": float(scores["test_roc_auc"].mean()),
        "cv_log_loss": float(-scores["test_neg_log_loss"].mean()),
        "cv_brier_score": float(-scores["test_neg_brier_score"].mean()),
    }


def plot_calibration_by_patch(predictions: pd.DataFrame, path) -> None:
    test_patches = sorted(predictions["patch"].unique(), key=patch_sort_key)
    fig, axes = plt.subplots(1, len(test_patches), figsize=(5 * len(test_patches), 5), sharey=True)
    if len(test_patches) == 1:
        axes = [axes]

    for ax, patch in zip(axes, test_patches):
        sub = predictions[predictions["patch"] == patch]
        y_true = sub["blue_win"].astype(int)
        proba = sub["pred_proba"]
        ax.plot([0, 1], [0, 1], linestyle="--", color="gray")
        try:
            prob_true, prob_pred = calibration_curve(y_true, proba, n_bins=8, strategy="quantile")
            ax.plot(prob_pred, prob_true, marker="o", color="tab:red")
        except ValueError:
            ax.scatter([proba.mean()], [y_true.mean()], color="tab:red")
        ax.set_title(f"Patch {patch} (n={len(sub)})")
        ax.set_xlabel("Mean predicted probability")
        ax.set_xlim(0, 1)
        ax.set_ylim(0, 1)
    axes[0].set_ylabel("Observed win rate")
    fig.suptitle("Day 3.5: calibration on each rolling-forward held-out patch")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    log.info("calibration_by_patch_saved path=%s", path)


def temporal_eval() -> None:
    df = load_dataset()
    windows = build_rolling_windows(df)
    log.info("rolling_windows=%s", [(w[0][-1] if w[0] else None, "->", w[1]) for w in windows])

    rolling_results = []
    cv_vs_future = []
    all_predictions = []

    for train_patches, test_patch in windows:
        train_df = df[df["patch"].isin(train_patches)]
        test_df = df[df["patch"] == test_patch]
        assert set(train_df["match_id"]).isdisjoint(set(test_df["match_id"]))

        metrics, proba = fit_predict_evaluate(train_df, test_df)
        cv_metrics = cv_score_on_training_window(train_df)

        row = {
            "train_through": train_patches[-1],
            "train_patches": train_patches,
            "train_rows": len(train_df),
            "test_patch": test_patch,
            "test_rows": len(test_df),
            **metrics,
        }
        rolling_results.append(row)

        gap_row = {
            "train_through": train_patches[-1],
            "test_patch": test_patch,
            "cv_roc_auc": cv_metrics["cv_roc_auc"],
            "future_roc_auc": metrics["roc_auc"],
            "roc_auc_gap": cv_metrics["cv_roc_auc"] - metrics["roc_auc"],
            "cv_log_loss": cv_metrics["cv_log_loss"],
            "future_log_loss": metrics["log_loss"],
            "log_loss_gap": metrics["log_loss"] - cv_metrics["cv_log_loss"],
        }
        cv_vs_future.append(gap_row)

        log.info(
            "fold train_through=%s test=%s train_rows=%d test_rows=%d roc_auc=%.4f cv_roc_auc=%.4f gap=%.4f log_loss=%.4f",
            train_patches[-1], test_patch, len(train_df), len(test_df),
            metrics["roc_auc"], cv_metrics["cv_roc_auc"], gap_row["roc_auc_gap"], metrics["log_loss"],
        )

        pred_df = test_df[["match_id", "patch", "blue_win"]].copy()
        pred_df["pred_proba"] = proba
        all_predictions.append(pred_df)

    roc_aucs = [r["roc_auc"] for r in rolling_results]
    log_losses = [r["log_loss"] for r in rolling_results]
    summary = {
        "n_folds": len(rolling_results),
        "mean_roc_auc": float(np.mean(roc_aucs)),
        "std_roc_auc": float(np.std(roc_aucs)),
        "mean_log_loss": float(np.mean(log_losses)),
        "std_log_loss": float(np.std(log_losses)),
    }
    log.info("rolling_summary mean_roc_auc=%.4f std_roc_auc=%.4f mean_log_loss=%.4f std_log_loss=%.4f",
              summary["mean_roc_auc"], summary["std_roc_auc"], summary["mean_log_loss"], summary["std_log_loss"])

    ROLLING_EVAL_PATH.write_text(json.dumps({"folds": rolling_results, "summary": summary, "fixed_config": FIXED_CONFIG}, indent=2, default=str))
    log.info("rolling_eval_saved path=%s", ROLLING_EVAL_PATH)

    mean_gap = float(np.mean([g["roc_auc_gap"] for g in cv_vs_future]))
    CV_VS_FUTURE_PATH.write_text(json.dumps({"folds": cv_vs_future, "mean_roc_auc_gap": mean_gap}, indent=2, default=str))
    log.info("cv_vs_future_saved path=%s mean_roc_auc_gap=%.4f", CV_VS_FUTURE_PATH, mean_gap)

    predictions = pd.concat(all_predictions, ignore_index=True)
    predictions.to_parquet(ROLLING_PREDICTIONS_PATH, index=False)
    plot_calibration_by_patch(predictions, CALIBRATION_BY_PATCH_PATH)

    EXPERIMENT_CONFIG_PATH.write_text(json.dumps({
        "fixed_config": FIXED_CONFIG,
        "random_state": RANDOM_STATE,
        "min_test_patch_rows": MIN_TEST_PATCH_ROWS,
        "rolling_windows": [{"train_through": w[0][-1], "train_patches": w[0], "test_patch": w[1]} for w in windows],
        "total_dataset_rows": len(df),
        "patches_available": sorted(df["patch"].unique(), key=patch_sort_key),
    }, indent=2, default=str))
    log.info("experiment_config_saved path=%s", EXPERIMENT_CONFIG_PATH)


if __name__ == "__main__":
    temporal_eval()

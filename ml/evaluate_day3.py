"""
Day 3, Step 7 (comparison), Step 8 (coefficient/overfitting inspection),
Step 9 (calibration). Loads the baseline + Experiment A (Day 2, rerun as-is)
+ Experiment B (tuned C) + Experiment C (tuned C + rare-category handling)
predictions, builds the full comparison table, and checks whether the
overfitting diagnosis from Day 2 actually improved.

Reuses evaluate.py's metric/coefficient functions rather than reimplementing
them -- they're already correct and this is the same underlying analysis,
just applied to more models.
"""

from __future__ import annotations

import json
import logging

import joblib
import matplotlib
import pandas as pd
from sklearn.calibration import calibration_curve

from evaluate import ARTIFACTS_DIR, CHAMPION_COLUMNS, compute_metrics, interpret_coefficients

matplotlib.use("Agg")
import matplotlib.pyplot as plt

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("evaluate_day3")

DAY2_METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
DAY2_PREDICTIONS_PATH = ARTIFACTS_DIR / "test_predictions.parquet"
DAY3_TRAINING_CONFIG_PATH = ARTIFACTS_DIR / "day3_training_config.json"
DAY3_METRICS_PATH = ARTIFACTS_DIR / "day3_metrics.json"
DAY3_CALIBRATION_PLOT_PATH = ARTIFACTS_DIR / "day3_calibration_plot.png"


def load_all_predictions() -> pd.DataFrame:
    """Merges baseline + Experiment A/B/C predictions on match_id, rather
    than assuming row order lines up across files fit at different times."""
    day2 = pd.read_parquet(DAY2_PREDICTIONS_PATH)[["match_id", "blue_win", "baseline_pred_proba", "logreg_pred_proba"]]
    day2 = day2.rename(columns={"logreg_pred_proba": "experiment_a_pred_proba"})

    exp_b = pd.read_parquet(ARTIFACTS_DIR / "day3_experiment_b_test_predictions.parquet")[["match_id", "pred_proba"]]
    exp_b = exp_b.rename(columns={"pred_proba": "experiment_b_pred_proba"})

    exp_c = pd.read_parquet(ARTIFACTS_DIR / "day3_experiment_c_test_predictions.parquet")[["match_id", "pred_proba"]]
    exp_c = exp_c.rename(columns={"pred_proba": "experiment_c_pred_proba"})

    merged = day2.merge(exp_b, on="match_id", how="inner").merge(exp_c, on="match_id", how="inner")
    assert len(merged) == len(day2), "row count changed during merge -- test sets for A/B/C don't match"
    return merged


def build_comparison_table(predictions: pd.DataFrame) -> dict:
    y_true = predictions["blue_win"].astype(int)
    models = {
        "constant_baseline": "baseline_pred_proba",
        "day2_logistic_experiment_a": "experiment_a_pred_proba",
        "tuned_logistic_experiment_b": "experiment_b_pred_proba",
        "tuned_plus_rare_handling_experiment_c": "experiment_c_pred_proba",
    }
    table = {}
    for name, col in models.items():
        table[name] = compute_metrics(y_true, predictions[col], name)
    return table


def plot_calibration_multi(predictions: pd.DataFrame, path) -> None:
    y_true = predictions["blue_win"].astype(int)
    n = len(y_true)
    n_bins = 10
    log.warning("calibration_note n_test_rows=%d n_bins=%d -- read qualitatively, not as a precise measurement", n, n_bins)

    fig, ax = plt.subplots(figsize=(7, 7))
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfectly calibrated")

    series = [
        ("baseline_pred_proba", "Baseline", "s"),
        ("experiment_a_pred_proba", "Exp A: Day 2 logistic", "^"),
        ("experiment_b_pred_proba", "Exp B: tuned C", "o"),
        ("experiment_c_pred_proba", "Exp C: tuned C + rare handling", "D"),
    ]
    for col, label, marker in series:
        proba = predictions[col]
        try:
            prob_true, prob_pred = calibration_curve(y_true, proba, n_bins=n_bins, strategy="quantile")
            ax.plot(prob_pred, prob_true, marker=marker, label=label)
        except ValueError:
            ax.scatter([proba.iloc[0]], [y_true.mean()], marker=marker, label=f"{label} (near-constant)")

    ax.set_xlabel("Mean predicted probability")
    ax.set_ylabel("Observed win rate")
    ax.set_title("Day 3: calibration comparison across experiments")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    log.info("calibration_plot_saved path=%s", path)


def coefficient_magnitude_summary(pipeline) -> dict:
    coefs = pipeline.named_steps["classifier"].coef_[0]
    series = pd.Series(coefs)
    return {
        "n_features": len(coefs),
        "abs_mean": float(series.abs().mean()),
        "abs_max": float(series.abs().max()),
        "abs_p95": float(series.abs().quantile(0.95)),
    }


def evaluate_day3() -> None:
    predictions = load_all_predictions()
    comparison_table = build_comparison_table(predictions)

    log.info("=" * 90)
    log.info("%-38s %10s %10s %10s %10s", "Model", "ROC-AUC", "LogLoss", "Brier", "Accuracy")
    for name, m in comparison_table.items():
        log.info("%-38s %10.4f %10.4f %10.4f %10.4f", name, m["roc_auc"], m["log_loss"], m["brier_score"], m["accuracy"])
    log.info("=" * 90)

    plot_calibration_multi(predictions, DAY3_CALIBRATION_PLOT_PATH)

    best_model = joblib.load(ARTIFACTS_DIR / "day3_experiment_c_model.joblib")
    best_interpretation = interpret_coefficients(best_model)
    best_magnitude = coefficient_magnitude_summary(best_model)

    day2_magnitude = None
    day2_interpretation = None
    if DAY2_METRICS_PATH.exists():
        day2_report = json.loads(DAY2_METRICS_PATH.read_text())
        day2_interpretation = {
            "top_positive": day2_report["top_positive_coefficients"],
            "top_negative": day2_report["top_negative_coefficients"],
        }
        day2_model = joblib.load(ARTIFACTS_DIR / "baseline_model.joblib")
        day2_magnitude = coefficient_magnitude_summary(day2_model)
        log.info(
            "coefficient_magnitude day2 n_features=%d abs_mean=%.4f abs_max=%.4f abs_p95=%.4f",
            day2_magnitude["n_features"], day2_magnitude["abs_mean"], day2_magnitude["abs_max"], day2_magnitude["abs_p95"],
        )
    log.info(
        "coefficient_magnitude day3_experiment_c n_features=%d abs_mean=%.4f abs_max=%.4f abs_p95=%.4f",
        best_magnitude["n_features"], best_magnitude["abs_mean"], best_magnitude["abs_max"], best_magnitude["abs_p95"],
    )

    report = {
        "day3_training_config": json.loads(DAY3_TRAINING_CONFIG_PATH.read_text()) if DAY3_TRAINING_CONFIG_PATH.exists() else None,
        "comparison_table": comparison_table,
        "best_model": "tuned_plus_rare_handling_experiment_c",
        "best_model_coefficient_magnitude": best_magnitude,
        "day2_coefficient_magnitude": day2_magnitude,
        "best_model_top_positive_coefficients": best_interpretation["top_positive"],
        "best_model_top_negative_coefficients": best_interpretation["top_negative"],
        "day2_top_coefficients_for_comparison": day2_interpretation,
        "interpretation_caveat": best_interpretation["caveat"],
        "calibration_note": f"Calibration measured on {len(predictions)} test rows in a single held-out patch -- read qualitatively.",
    }
    DAY3_METRICS_PATH.write_text(json.dumps(report, indent=2, default=str))
    log.info("day3_metrics_saved path=%s", DAY3_METRICS_PATH)


if __name__ == "__main__":
    evaluate_day3()

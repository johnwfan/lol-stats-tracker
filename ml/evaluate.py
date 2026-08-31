"""
Day 2: loads the artifacts train.py produced, computes evaluation metrics
for the trivial baseline and the logistic regression model side by side,
checks probability calibration, and interprets the logistic regression
coefficients (non-causally).

Deliberately reads train.py's saved outputs rather than re-deriving the
train/test split itself, so the split logic exists in exactly one place.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import matplotlib
import numpy as np
import pandas as pd
from sklearn.calibration import calibration_curve
from sklearn.metrics import accuracy_score, brier_score_loss, confusion_matrix, log_loss, roc_auc_score

matplotlib.use("Agg")  # headless: this script never runs in a notebook/interactive context
import matplotlib.pyplot as plt

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("evaluate")

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "baseline_model.joblib"
TEST_PREDICTIONS_PATH = ARTIFACTS_DIR / "test_predictions.parquet"
TRAINING_CONFIG_PATH = ARTIFACTS_DIR / "training_config.json"
METRICS_PATH = ARTIFACTS_DIR / "metrics.json"
CALIBRATION_PLOT_PATH = ARTIFACTS_DIR / "calibration_plot.png"

CHAMPION_COLUMNS = [
    "blue_top", "blue_jungle", "blue_mid", "blue_adc", "blue_support",
    "red_top", "red_jungle", "red_mid", "red_adc", "red_support",
]

INTERPRETATION_CAVEAT = (
    "Coefficients describe an association the model found in this dataset between a "
    "champion-role feature and predicted Blue-side win probability -- not a causal claim "
    "('this champion causes wins'). Logistic regression over one-hot features is additive: "
    "each feature contributes independently to the prediction, so these coefficients do not "
    "capture champion-pair synergies or counters (e.g. 'champion A is strong specifically "
    "when paired with champion B' is not something this model can represent)."
)


def load_test_predictions() -> pd.DataFrame:
    if not TEST_PREDICTIONS_PATH.exists():
        raise FileNotFoundError(f"No test predictions found at {TEST_PREDICTIONS_PATH}. Run train.py first.")
    return pd.read_parquet(TEST_PREDICTIONS_PATH)


def load_training_config() -> dict:
    if not TRAINING_CONFIG_PATH.exists():
        raise FileNotFoundError(f"No training config found at {TRAINING_CONFIG_PATH}. Run train.py first.")
    return json.loads(TRAINING_CONFIG_PATH.read_text())


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"No saved model found at {MODEL_PATH}. Run train.py first.")
    return joblib.load(MODEL_PATH)


def compute_metrics(y_true: pd.Series, y_proba: pd.Series, name: str) -> dict:
    """A constant-probability predictor (the baseline) will always score
    exactly 0.5 ROC-AUC -- a constant score has zero ability to rank
    positive vs negative examples relative to each other, regardless of
    what the constant value is. That's a useful, exact anchor: logistic
    regression's ROC-AUC has to clear 0.5 to demonstrate any discrimination
    at all, not just "get close to" the baseline's accuracy."""
    y_pred = (y_proba >= 0.5).astype(int)
    metrics = {
        "n": int(len(y_true)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "roc_auc": float(roc_auc_score(y_true, y_proba)),
        "log_loss": float(log_loss(y_true, y_proba, labels=[0, 1])),
        "brier_score": float(brier_score_loss(y_true, y_proba)),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=[0, 1]).tolist(),
    }
    log.info(
        "metrics name=%s accuracy=%.4f roc_auc=%.4f log_loss=%.4f brier_score=%.4f",
        name, metrics["accuracy"], metrics["roc_auc"], metrics["log_loss"], metrics["brier_score"],
    )
    return metrics


def compare_to_baseline(baseline: dict, logreg: dict) -> dict:
    """Higher is better for accuracy/roc_auc; lower is better for
    log_loss/brier_score -- deltas are signed so 'positive' always means
    'logreg is better' regardless of which direction that metric goes."""
    comparison = {
        "accuracy_delta": logreg["accuracy"] - baseline["accuracy"],
        "roc_auc_delta": logreg["roc_auc"] - baseline["roc_auc"],
        "log_loss_delta": baseline["log_loss"] - logreg["log_loss"],
        "brier_score_delta": baseline["brier_score"] - logreg["brier_score"],
    }
    comparison["beat_baseline"] = (
        comparison["roc_auc_delta"] > 0
        and comparison["accuracy_delta"] > 0
        and comparison["log_loss_delta"] > 0
    )
    return comparison


def plot_calibration(y_true: pd.Series, baseline_proba: pd.Series, logreg_proba: pd.Series, path: Path) -> None:
    """Reliability diagram: bins predictions by predicted probability and
    plots the actual observed win rate within each bin against it. A
    perfectly calibrated model's points sit on the y=x diagonal -- if the
    model says 60% for a group of matches, about 60% of them should
    actually be wins.

    Quantile binning (equal-sized bins by count, not equal-width probability
    ranges) is used because with only 212 test rows, uniform bins across
    [0, 1] would leave several bins with very few or zero points.

    The baseline's curve collapses to essentially a single point, since it
    predicts the same probability for every row -- that's expected, not a
    bug: there's nothing to bin when there's only one predicted value.
    """
    n_bins = 10
    log.warning(
        "calibration_note n_test_rows=%d n_bins=%d -- with only ~21 points per bin, "
        "read this plot qualitatively (rough trend), not as a precise measurement",
        len(y_true), n_bins,
    )

    fig, ax = plt.subplots(figsize=(6, 6))
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfectly calibrated")

    for proba, label, marker in [(baseline_proba, "Baseline", "s"), (logreg_proba, "Logistic Regression", "o")]:
        try:
            prob_true, prob_pred = calibration_curve(y_true, proba, n_bins=n_bins, strategy="quantile")
            ax.plot(prob_pred, prob_true, marker=marker, label=label)
        except ValueError:
            # Constant predictions (the baseline) can't form multiple quantile bins.
            ax.scatter([proba.iloc[0]], [y_true.mean()], marker=marker, label=f"{label} (constant prediction)")

    ax.set_xlabel("Mean predicted probability")
    ax.set_ylabel("Observed win rate")
    ax.set_title("Calibration: predicted vs. observed Blue win probability")
    ax.legend()
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    log.info("calibration_plot_saved path=%s", path)


def parse_feature_name(name: str, champion_columns: list[str]) -> tuple[str, str]:
    """ColumnTransformer.get_feature_names_out() produces names like
    'onehot__blue_top_Aatrox' (format: '{transformer_name}__{column}_{category}').
    Strips the transformer prefix, then matches which of the 10 known role
    columns the remainder starts with, to recover (role_column, champion).
    This relies on champion names never containing an underscore, which
    holds for Riot's PascalCase championName field (e.g. 'MissFortune')."""
    _, rest = name.split("__", 1)
    for col in champion_columns:
        prefix = col + "_"
        if rest.startswith(prefix):
            champion = rest[len(prefix):]
            assert champion, f"failed to parse a champion name out of feature '{name}'"
            return col, champion
    raise ValueError(f"could not match feature name '{name}' to any known champion column")


def interpret_coefficients(pipeline, top_n: int = 15) -> dict:
    feature_names = pipeline.named_steps["preprocessing"].get_feature_names_out()
    coefs = pipeline.named_steps["classifier"].coef_[0]

    rows = [
        {"role_column": (parsed := parse_feature_name(name, CHAMPION_COLUMNS))[0], "champion": parsed[1], "coefficient": float(coef)}
        for name, coef in zip(feature_names, coefs)
    ]
    coef_df = pd.DataFrame(rows).sort_values("coefficient", ascending=False)

    return {
        "top_positive": coef_df.head(top_n).to_dict(orient="records"),
        "top_negative": coef_df.tail(top_n).sort_values("coefficient").to_dict(orient="records"),
        "caveat": INTERPRETATION_CAVEAT,
    }


def evaluate() -> None:
    predictions = load_test_predictions()
    config = load_training_config()
    model = load_model()

    y_true = predictions["blue_win"].astype(int)
    baseline_proba = predictions["baseline_pred_proba"]
    logreg_proba = predictions["logreg_pred_proba"]

    baseline_metrics = compute_metrics(y_true, baseline_proba, "baseline")
    logreg_metrics = compute_metrics(y_true, logreg_proba, "logreg")
    comparison = compare_to_baseline(baseline_metrics, logreg_metrics)

    plot_calibration(y_true, baseline_proba, logreg_proba, CALIBRATION_PLOT_PATH)

    interpretation = interpret_coefficients(model)

    report = {
        "config": config,
        "baseline_metrics": baseline_metrics,
        "logreg_metrics": logreg_metrics,
        "comparison": comparison,
        "top_positive_coefficients": interpretation["top_positive"],
        "top_negative_coefficients": interpretation["top_negative"],
        "interpretation_caveat": interpretation["caveat"],
        "calibration_note": (
            f"Calibration measured on only {len(y_true)} test rows in a single held-out patch "
            "-- read the calibration plot as a rough qualitative trend, not a precise measurement."
        ),
    }
    METRICS_PATH.write_text(json.dumps(report, indent=2))
    log.info("metrics_saved path=%s", METRICS_PATH)

    limitations = [
        f"{config['n_onehot_features']} one-hot features fit on {config['train_rows']} training rows "
        "-- a thin ratio that limits how much confidence to place in any single coefficient, "
        "especially for champions/roles seen rarely in training.",
        "Logistic regression is additive over one-hot features -- it cannot model champion-pair "
        "synergies or counters.",
        f"Test set is a single patch ({config['test_patch']}) with only {config['test_rows']} rows "
        "-- calibration and metric estimates carry real sampling noise.",
    ]

    log.info("=" * 70)
    log.info("EVALUATION SUMMARY")
    log.info("Dataset: %d train rows (patches %s), %d test rows (patch %s)",
              config["train_rows"], config["train_patches"], config["test_rows"], config["test_patch"])
    log.info("Baseline   -- accuracy=%.4f roc_auc=%.4f log_loss=%.4f brier=%.4f",
              baseline_metrics["accuracy"], baseline_metrics["roc_auc"], baseline_metrics["log_loss"], baseline_metrics["brier_score"])
    log.info("LogReg     -- accuracy=%.4f roc_auc=%.4f log_loss=%.4f brier=%.4f",
              logreg_metrics["accuracy"], logreg_metrics["roc_auc"], logreg_metrics["log_loss"], logreg_metrics["brier_score"])
    log.info("Delta      -- accuracy=%+.4f roc_auc=%+.4f log_loss=%+.4f (positive=logreg better) brier=%+.4f",
              comparison["accuracy_delta"], comparison["roc_auc_delta"], comparison["log_loss_delta"], comparison["brier_score_delta"])
    log.info("Beat baseline on all of accuracy/roc_auc/log_loss: %s", comparison["beat_baseline"])
    for limitation in limitations:
        log.info("LIMITATION: %s", limitation)
    log.info("=" * 70)


if __name__ == "__main__":
    evaluate()

"""
Day 6: freezes the MVP model for production use.

Research is done -- Days 3.5/4/5 already validated C=0.01, min_frequency=50
via extensive rolling forward-patch evaluation. That config does not change
here. What changes is the training data: research artifacts (e.g.
day3_experiment_c_model.joblib) deliberately held out patch 16.17 to
measure generalization. That measurement is complete, so this script
refits the exact same config on 100% of the available data (14,826 rows)
for the actual deployed model -- standard practice (validate via held-out
evaluation, then refit on everything for production).

Reads only from ml/ (load_dataset, CHAMPION_COLUMNS, build_logreg_pipeline
in train.py); writes only into ml-service/ (model_registry/, reference
distribution, champion vocabulary). Never touches ml/artifacts/.
"""

from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import sklearn

from train import CHAMPION_COLUMNS, RANDOM_STATE, build_logreg_pipeline, load_dataset, patch_sort_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("freeze_final_model")

ML_SERVICE_DIR = Path(__file__).parent.parent / "ml-service"
MODEL_REGISTRY_DIR = ML_SERVICE_DIR / "model_registry"
MODEL_VERSION = "draft-logreg-v1"

FROZEN_CONFIG = {"C": 0.01, "min_frequency": 50}

# Copied from the already-computed Day 3.5/4 rolling evaluation summaries
# (artifacts/day3_5_rolling_forward_eval.json, artifacts/day4_metrics.json)
# -- not recomputed here, this script only trains the production artifact.
EVALUATION_SUMMARY = {
    "method": "rolling forward-patch evaluation (train on all patches before N, test on N)",
    "day3_5_logistic_rolling": {"mean_roc_auc": 0.5117, "std_roc_auc": 0.0229, "mean_log_loss": 0.6907, "n_folds": 5},
    "day4_comparison_vs_catboost": {
        "logistic": {"mean_roc_auc": 0.5117, "mean_log_loss": 0.6907, "mean_brier": 0.2488},
        "catboost": {"mean_roc_auc": 0.5172, "mean_log_loss": 0.6905, "mean_brier": 0.2487},
        "conclusion": "statistically indistinguishable on log loss/Brier/accuracy; CatBoost's ROC-AUC edge was driven by one fold (2/5 wins) and showed measurable overfitting (~0.10 train-test ROC-AUC gap). Logistic regression selected: simpler, no less effective, no evidence CatBoost is worth the complexity.",
    },
}


def build_champion_vocabulary(df) -> list[str]:
    """Union of every champion name observed across all 10 role columns in
    training -- the only self-contained, defensible validation list without
    adding a live Data Dragon dependency to the inference service. A very
    recently released champion absent from training data would be rejected
    by the API rather than silently mishandled; documented as a known MVP
    limitation rather than engineered around."""
    champions = set()
    for col in CHAMPION_COLUMNS:
        champions.update(df[col].unique())
    return sorted(champions)


def compute_reference_distribution(pipeline, df) -> dict:
    scores = pipeline.predict_proba(df[CHAMPION_COLUMNS])[:, 1]
    return {
        "n_samples": len(scores),
        "mean": float(scores.mean()),
        "std": float(scores.std()),
        "min": float(scores.min()),
        "max": float(scores.max()),
        "percentiles": {str(p): float(np.percentile(scores, p)) for p in [1, 5, 10, 25, 50, 75, 90, 95, 99]},
    }


def freeze() -> None:
    MODEL_REGISTRY_DIR.mkdir(parents=True, exist_ok=True)

    df = load_dataset()
    log.info("dataset_loaded rows=%d patches=%s", len(df), sorted(df["patch"].unique(), key=patch_sort_key))

    X, y = df[CHAMPION_COLUMNS], df["blue_win"].astype(int)
    pipeline = build_logreg_pipeline(**FROZEN_CONFIG)
    pipeline.fit(X, y)
    n_features = len(pipeline.named_steps["preprocessing"].get_feature_names_out())
    log.info("model_fit config=%s n_features=%d train_rows=%d", FROZEN_CONFIG, n_features, len(df))

    model_path = MODEL_REGISTRY_DIR / f"{MODEL_VERSION}.joblib"
    joblib.dump(pipeline, model_path)
    log.info("model_saved path=%s", model_path)

    reference_distribution = compute_reference_distribution(pipeline, df)
    log.info("reference_distribution mean=%.4f std=%.4f n_samples=%d", reference_distribution["mean"], reference_distribution["std"], reference_distribution["n_samples"])
    (ML_SERVICE_DIR / "reference_distribution.json").write_text(json.dumps(reference_distribution, indent=2))

    champion_vocabulary = build_champion_vocabulary(df)
    log.info("champion_vocabulary_built n_champions=%d", len(champion_vocabulary))
    (ML_SERVICE_DIR / "champion_vocabulary.json").write_text(json.dumps(champion_vocabulary, indent=2))

    metadata = {
        "model_version": MODEL_VERSION,
        "training_date": date.today().isoformat(),
        "config": {**FROZEN_CONFIG, "random_state": RANDOM_STATE, "solver": "lbfgs", "max_iter": 1000},
        "dataset": {
            "n_rows": len(df),
            "patches": sorted(df["patch"].unique(), key=patch_sort_key),
            "reference_population": "Ranked Solo/Duo (queue 420) matches, NA1 platform, Challenger/Grandmaster/Master players only (apex tier -- see Day 5 research notes on population scope; Gold/Platinum/Emerald/Diamond cohorts were collected for comparison research only and are not part of this model's training data)",
        },
        "feature_columns": CHAMPION_COLUMNS,
        "n_onehot_features": n_features,
        "sklearn_version": sklearn.__version__,
        "evaluation_summary": EVALUATION_SUMMARY,
        "selection_rationale": (
            "Selected over CatBoost (Day 4): statistically indistinguishable on log loss/Brier/accuracy, "
            "CatBoost's ROC-AUC edge was unstable (driven by one of five rolling folds) and showed real "
            "overfitting. Logistic regression is simpler, more interpretable, and the product no longer "
            "claims precise win probabilities -- there is no evidence justifying the added complexity."
        ),
    }
    (MODEL_REGISTRY_DIR / f"{MODEL_VERSION}.json").write_text(json.dumps(metadata, indent=2))
    log.info("metadata_saved path=%s", MODEL_REGISTRY_DIR / f"{MODEL_VERSION}.json")
    log.info("freeze_complete model_version=%s", MODEL_VERSION)


if __name__ == "__main__":
    freeze()

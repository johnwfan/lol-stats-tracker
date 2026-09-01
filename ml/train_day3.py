"""
Day 3, Step 7 (fitting half): fits Experiment B (tuned C, no rare-category
handling) and Experiment C (tuned C + rare-category handling) on the full
training set, using the winning hyperparameters tune.py found via
cross-validation on training data only.

Experiment A is intentionally not refit here -- it's Day 2's unmodified
train.py, rerun as-is against whatever dataset currently exists. Keeping
it that way (rather than reimplementing it a second time) means there is
exactly one place Experiment A's logic lives.

Artifacts are saved under a day3_ prefix so Day 2's artifacts are never
overwritten -- both remain on disk side by side for comparison.
"""

from __future__ import annotations

import json
import logging

import joblib

from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, build_logreg_pipeline, load_dataset, split_by_patch

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("train_day3")

TUNING_RESULTS_PATH = ARTIFACTS_DIR / "day3_tuning_results.json"
TRAINING_CONFIG_PATH = ARTIFACTS_DIR / "day3_training_config.json"


def _min_freq_from_json(value) -> int | None:
    """day3_tuning_results.json stores None as the string "none" (JSON has
    no native null-in-this-context distinction issue here, but the value
    came from a pandas NaN via to_dict(), so it round-trips as a float NaN
    or the literal None depending on path -- normalize defensively)."""
    if value is None or (isinstance(value, str) and value.lower() == "none"):
        return None
    if isinstance(value, float) and value != value:  # NaN
        return None
    return int(value)


def fit_and_save(experiment_name: str, C: float, min_frequency: int | None, X_train, y_train, X_test, y_test, test_df) -> dict:
    pipeline = build_logreg_pipeline(C=C, min_frequency=min_frequency)
    pipeline.fit(X_train, y_train)

    model_path = ARTIFACTS_DIR / f"day3_{experiment_name}_model.joblib"
    joblib.dump(pipeline, model_path)

    predictions = test_df[["match_id", "patch", "blue_win"] + CHAMPION_COLUMNS].copy()
    predictions["pred_proba"] = pipeline.predict_proba(X_test)[:, 1]
    predictions_path = ARTIFACTS_DIR / f"day3_{experiment_name}_test_predictions.parquet"
    predictions.to_parquet(predictions_path, index=False)

    n_features = len(pipeline.named_steps["preprocessing"].get_feature_names_out())
    log.info(
        "experiment_fit name=%s C=%s min_frequency=%s n_features=%d model_path=%s",
        experiment_name, C, min_frequency, n_features, model_path,
    )
    return {"C": C, "min_frequency": min_frequency, "n_features": n_features, "model_path": str(model_path), "predictions_path": str(predictions_path)}


def train_day3() -> None:
    if not TUNING_RESULTS_PATH.exists():
        raise FileNotFoundError(f"No tuning results at {TUNING_RESULTS_PATH}. Run tune.py first.")
    tuning = json.loads(TUNING_RESULTS_PATH.read_text())

    df = load_dataset()
    train_df, test_df = split_by_patch(df)
    X_train, y_train = train_df[CHAMPION_COLUMNS], train_df["blue_win"].astype(int)
    X_test, y_test = test_df[CHAMPION_COLUMNS], test_df["blue_win"].astype(int)

    experiment_b_config = tuning["best_no_filtering_experiment_b"]
    experiment_c_config = tuning["best_overall_experiment_c"]

    experiment_b = fit_and_save(
        "experiment_b", float(experiment_b_config["C"]), _min_freq_from_json(experiment_b_config["min_frequency"]),
        X_train, y_train, X_test, y_test, test_df,
    )
    experiment_c = fit_and_save(
        "experiment_c", float(experiment_c_config["C"]), _min_freq_from_json(experiment_c_config["min_frequency"]),
        X_train, y_train, X_test, y_test, test_df,
    )

    config = {
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "train_patches": sorted(train_df["patch"].unique().tolist()),
        "test_patch": test_df["patch"].iloc[0],
        "experiment_b": experiment_b,
        "experiment_c": experiment_c,
        "selection_method": "GridSearchCV, StratifiedKFold(5), refit=neg_log_loss, training patches only",
    }
    TRAINING_CONFIG_PATH.write_text(json.dumps(config, indent=2, default=str))
    log.info("day3_training_config_saved path=%s", TRAINING_CONFIG_PATH)


if __name__ == "__main__":
    train_day3()

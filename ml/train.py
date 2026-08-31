"""
Day 2: fits a trivial baseline and a logistic regression model on the
draft-only dataset produced by preprocess.py, and saves everything needed
to evaluate and later serve them.

Scope is deliberately narrow: only the 10 champion-role columns as
features, one-hot encoding, logistic regression. No manual synergy/counter
features, no XGBoost/LightGBM, no neural nets -- those are explicitly
Day 3+ questions, not this script's job.

Splitting is chronological by patch (train on older patches, test on the
newest), not random -- see split_by_patch() for why.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("train")

DATA_DIR = Path(__file__).parent / "data"
PARQUET_PATH = DATA_DIR / "processed" / "dataset.parquet"
CSV_PATH = DATA_DIR / "processed" / "dataset.csv"

ARTIFACTS_DIR = Path(__file__).parent / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "baseline_model.joblib"
TEST_PREDICTIONS_PATH = ARTIFACTS_DIR / "test_predictions.parquet"
TRAINING_CONFIG_PATH = ARTIFACTS_DIR / "training_config.json"

CHAMPION_COLUMNS = [
    "blue_top", "blue_jungle", "blue_mid", "blue_adc", "blue_support",
    "red_top", "red_jungle", "red_mid", "red_adc", "red_support",
]

RANDOM_STATE = 42


def load_dataset() -> pd.DataFrame:
    if PARQUET_PATH.exists():
        return pd.read_parquet(PARQUET_PATH)
    if CSV_PATH.exists():
        return pd.read_csv(CSV_PATH)
    raise FileNotFoundError(f"No processed dataset found at {PARQUET_PATH} or {CSV_PATH}. Run preprocess.py first.")


def patch_sort_key(patch: str) -> tuple[int, int]:
    """Parses '16.17' -> (16, 17) so patches sort numerically, not lexically.
    String-sorting breaks in general (e.g. '16.9' > '16.10' as strings) even
    though it happens to work for the current single-major-version dataset."""
    major, minor = patch.split(".")
    return (int(major), int(minor))


def split_by_patch(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Holds out the newest patch as the test set. This is a chronological
    split, not a random one: it measures whether the model generalizes to
    a patch it has never seen, which is the realistic use case for a draft
    tool (predicting on future patches), rather than just interpolating
    within patches it was already trained on."""
    patches = df["patch"].unique()
    test_patch = max(patches, key=patch_sort_key)
    train_patches = sorted((p for p in patches if p != test_patch), key=patch_sort_key)

    train_df = df[df["patch"] != test_patch]
    test_df = df[df["patch"] == test_patch]

    assert set(train_df["match_id"]).isdisjoint(set(test_df["match_id"])), "train/test match_id overlap detected"

    log.info(
        "split_by_patch train_patches=%s test_patch=%s train_rows=%d test_rows=%d train_blue_win_rate=%.4f test_blue_win_rate=%.4f",
        train_patches, test_patch, len(train_df), len(test_df),
        train_df["blue_win"].mean(), test_df["blue_win"].mean(),
    )
    return train_df, test_df


def build_preprocessor() -> ColumnTransformer:
    """One-hot encodes all 10 champion-role columns. OneHotEncoder fits an
    independent vocabulary per input column regardless of how many columns
    are passed to a single instance, so this is equivalent to (not a
    compromise versus) using 10 separate encoders -- 'blue_top_Aatrox' and
    'red_jungle_Aatrox' are always distinct output features.

    handle_unknown="ignore" is required, not optional: the patch-based split
    guarantees some (row, column) combinations in the test set were never
    seen in that exact column during training (e.g. a champion that was
    always jungle in training showing up mid in test) -- without this,
    transforming the test set would raise instead of encoding those cells
    as all-zero.
    """
    return ColumnTransformer(
        transformers=[("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=True), CHAMPION_COLUMNS)]
    )


def build_baseline_pipeline() -> Pipeline:
    """Trivial baseline: DummyClassifier(strategy="prior") predicts the
    training set's class frequency as the probability for every row, and
    the resulting majority label as the hard prediction -- this is the
    thing logistic regression actually has to beat."""
    return Pipeline([
        ("preprocessing", build_preprocessor()),
        ("classifier", DummyClassifier(strategy="prior", random_state=RANDOM_STATE)),
    ])


def build_logreg_pipeline() -> Pipeline:
    """Logistic regression over ~930 sparse one-hot features fit on ~1,276
    training rows -- a thin ratio that risks overfitting. `penalty` is left
    at its default (L2 regularization, which is what keeps this workable) --
    sklearn 1.8+ deprecated passing penalty="l2" explicitly in favor of just
    omitting it. class_weight is left at default since the classes are
    already near-balanced. max_iter is raised from sklearn's default of 100
    because high-dimensional sparse fits sometimes need more iterations to
    converge cleanly."""
    return Pipeline([
        ("preprocessing", build_preprocessor()),
        ("classifier", LogisticRegression(solver="lbfgs", max_iter=1000, random_state=RANDOM_STATE)),
    ])


def train() -> None:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

    df = load_dataset()
    log.info("dataset_loaded rows=%d columns=%d", len(df), len(df.columns))

    train_df, test_df = split_by_patch(df)

    X_train, y_train = train_df[CHAMPION_COLUMNS], train_df["blue_win"].astype(int)
    X_test, y_test = test_df[CHAMPION_COLUMNS], test_df["blue_win"].astype(int)

    baseline_pipeline = build_baseline_pipeline()
    baseline_pipeline.fit(X_train, y_train)
    log.info("baseline_fit train_blue_win_rate=%.4f (this is the constant probability it will predict)", y_train.mean())

    logreg_pipeline = build_logreg_pipeline()
    logreg_pipeline.fit(X_train, y_train)
    n_features = len(logreg_pipeline.named_steps["preprocessing"].get_feature_names_out())
    log.info("logreg_fit n_onehot_features=%d train_rows=%d", n_features, len(X_train))

    predictions = test_df[["match_id", "patch", "blue_win"] + CHAMPION_COLUMNS].copy()
    predictions["baseline_pred_proba"] = baseline_pipeline.predict_proba(X_test)[:, 1]
    predictions["logreg_pred_proba"] = logreg_pipeline.predict_proba(X_test)[:, 1]
    predictions.to_parquet(TEST_PREDICTIONS_PATH, index=False)
    log.info("test_predictions_saved path=%s rows=%d", TEST_PREDICTIONS_PATH, len(predictions))

    joblib.dump(logreg_pipeline, MODEL_PATH)
    log.info("model_saved path=%s", MODEL_PATH)

    config = {
        "random_state": RANDOM_STATE,
        "split_method": "patch_chronological",
        "train_patches": sorted(train_df["patch"].unique(), key=patch_sort_key),
        "test_patch": test_df["patch"].iloc[0],
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "train_blue_win_rate": float(y_train.mean()),
        "test_blue_win_rate": float(y_test.mean()),
        "feature_columns": CHAMPION_COLUMNS,
        "excluded_features": {
            "patch": "test set's patch is never seen in training under this split, so a one-hot patch feature would be all-zero (no signal) at test time while adding train-time noise",
            "queue_id": "constant (always 420) -- zero information",
        },
        "n_onehot_features": n_features,
        "baseline_strategy": "prior",
        "logreg_hyperparams": {
            "penalty": "l2 (sklearn default)",
            "solver": "lbfgs",
            "max_iter": 1000,
            "random_state": RANDOM_STATE,
        },
        "sklearn_version": sklearn.__version__,
    }
    TRAINING_CONFIG_PATH.write_text(json.dumps(config, indent=2))
    log.info("training_config_saved path=%s", TRAINING_CONFIG_PATH)

    log.info(
        "train_complete train_rows=%d test_rows=%d n_features=%d artifacts_dir=%s",
        len(train_df), len(test_df), n_features, ARTIFACTS_DIR,
    )


if __name__ == "__main__":
    train()

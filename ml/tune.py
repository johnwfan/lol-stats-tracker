"""
Day 3, Steps 4 & 5: a single grid search over regularization strength (C)
and rare-category handling (min_frequency), using cross-validation within
the training patches only. The held-out newest patch is never touched here
-- hyperparameter selection must not be influenced by test data.

min_frequency=None rows in the grid are the Step 4 (regularization-only)
search space; min_frequency>0 rows are the Step 5 (regularization + rare-
category handling) search space -- unifying both into one search means the
comparison ("does rare-category handling help") falls out of the results
rather than being assumed.
"""

from __future__ import annotations

import json
import logging

import pandas as pd
from sklearn.model_selection import GridSearchCV, StratifiedKFold

from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, RANDOM_STATE, build_logreg_pipeline, load_dataset, split_by_patch

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("tune")

OUTPUT_PATH = ARTIFACTS_DIR / "day3_tuning_results.json"

# C grid as specified: log-spaced, spanning strong to weak regularization.
C_GRID = [0.001, 0.01, 0.1, 1, 10]

# None = no rare-category handling (Day 2 style / Step 4 search space).
# 5/10/20/50 = Step 3's own requested frequency cutoffs, reused here as
# Step 5's candidate thresholds so both steps rest on the same evidence.
MIN_FREQUENCY_GRID = [None, 5, 10, 20, 50]

# Primary selection metric matches the product's stated priority: probability
# quality (log loss) over raw accuracy. roc_auc/brier/accuracy are still
# tracked via multi-metric scoring for full reporting.
SCORING = {
    "neg_log_loss": "neg_log_loss",
    "roc_auc": "roc_auc",
    "neg_brier_score": "neg_brier_score",
    "accuracy": "accuracy",
}
REFIT_METRIC = "neg_log_loss"


def run_grid_search(X_train: pd.DataFrame, y_train: pd.Series) -> GridSearchCV:
    pipeline = build_logreg_pipeline()  # C and min_frequency are overridden by the grid below
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    grid = GridSearchCV(
        pipeline,
        param_grid={
            "classifier__C": C_GRID,
            "preprocessing__onehot__min_frequency": MIN_FREQUENCY_GRID,
        },
        scoring=SCORING,
        refit=REFIT_METRIC,
        cv=cv,
        n_jobs=-1,
    )
    grid.fit(X_train, y_train)
    return grid


def summarize_results(grid: GridSearchCV) -> dict:
    results_df = pd.DataFrame(grid.cv_results_)
    results_df = results_df[[
        "param_classifier__C", "param_preprocessing__onehot__min_frequency",
        "mean_test_neg_log_loss", "mean_test_roc_auc", "mean_test_neg_brier_score", "mean_test_accuracy",
        "rank_test_neg_log_loss",
    ]].rename(columns={
        "param_classifier__C": "C",
        "param_preprocessing__onehot__min_frequency": "min_frequency",
        "mean_test_neg_log_loss": "cv_log_loss",
        "mean_test_roc_auc": "cv_roc_auc",
        "mean_test_neg_brier_score": "cv_brier_score",
        "mean_test_accuracy": "cv_accuracy",
    })
    # neg_log_loss/neg_brier_score are negated for sklearn's "higher is better" scoring convention -- flip back for readability.
    results_df["cv_log_loss"] = -results_df["cv_log_loss"]
    results_df["cv_brier_score"] = -results_df["cv_brier_score"]
    results_df = results_df.sort_values("rank_test_neg_log_loss")

    all_results = results_df.to_dict(orient="records")

    best_overall = results_df.iloc[0].to_dict()  # Experiment C candidate: best combo, filtering allowed

    no_filtering = results_df[results_df["min_frequency"].isna()]
    best_no_filtering = no_filtering.sort_values("cv_log_loss").iloc[0].to_dict()  # Experiment B candidate: best C, no filtering

    log.info(
        "best_overall C=%s min_frequency=%s cv_log_loss=%.4f cv_roc_auc=%.4f cv_brier_score=%.4f",
        best_overall["C"], best_overall["min_frequency"], best_overall["cv_log_loss"], best_overall["cv_roc_auc"], best_overall["cv_brier_score"],
    )
    log.info(
        "best_no_filtering C=%s cv_log_loss=%.4f cv_roc_auc=%.4f cv_brier_score=%.4f",
        best_no_filtering["C"], best_no_filtering["cv_log_loss"], best_no_filtering["cv_roc_auc"], best_no_filtering["cv_brier_score"],
    )

    rare_handling_helps = best_overall["min_frequency"] is not None and not pd.isna(best_overall["min_frequency"])
    log.info("rare_category_handling_improves_cv_log_loss=%s", rare_handling_helps)

    return {
        "c_grid": C_GRID,
        "min_frequency_grid": [m if m is not None else "none" for m in MIN_FREQUENCY_GRID],
        "cv_scheme": "StratifiedKFold(n_splits=5, shuffle=True, random_state=42) on training patches only",
        "refit_metric": REFIT_METRIC,
        "all_results": all_results,
        "best_overall_experiment_c": best_overall,
        "best_no_filtering_experiment_b": best_no_filtering,
        "rare_category_handling_improves_cv_log_loss": bool(rare_handling_helps),
    }


def tune() -> None:
    df = load_dataset()
    train_df, _ = split_by_patch(df)  # test patch is never loaded into this function's scope at all
    X_train = train_df[CHAMPION_COLUMNS]
    y_train = train_df["blue_win"].astype(int)

    log.info("tuning_started train_rows=%d c_grid=%s min_frequency_grid=%s", len(X_train), C_GRID, MIN_FREQUENCY_GRID)

    grid = run_grid_search(X_train, y_train)
    summary = summarize_results(grid)

    OUTPUT_PATH.write_text(json.dumps(summary, indent=2, default=str))
    log.info("tuning_results_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    tune()

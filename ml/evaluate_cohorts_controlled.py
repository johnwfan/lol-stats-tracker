"""
Day 5 controlled rerun: fixes two confounds found in the original cohort
comparison (evaluate_cohorts.py) before drawing any skill-tier conclusion.

Confound 1 -- patch/time mismatch: cohorts collected today can span a much
wider calendar range than Master+'s tight 16.10-16.17 window (Gold spans
14.18-16.17, 48 patches). Fixed by restricting every tier to the same
16.10-16.17 window and the same rolling test patches.

Confound 2 -- min_frequency=50 is an absolute floor tuned against Day 3's
10,666-row training pool; applied unchanged to much smaller cohort folds
it collapses the vast majority of categories (82-98% observed for Gold).
Fixed by deriving a RELATIVE threshold from what min_frequency=50 actually
represented as a proportion of that original training pool, then applying
it as a float to OneHotEncoder(min_frequency=...), which scikit-learn
interprets as a fraction of n_samples -- so the absolute cutoff scales
with each fold's actual size instead of staying fixed.

Master+ is rerun here too (not reused from Day 3.5/4) -- comparing a
newly-fixed Gold against an old-preprocessing Master+ would just move the
unfairness from "different patches" to "different preprocessing rules."
"""

from __future__ import annotations

import json
import logging

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from evaluate import compute_metrics
from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, DATA_DIR, RANDOM_STATE, load_dataset, patch_sort_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("evaluate_cohorts_controlled")

PROCESSED_DIR = DATA_DIR / "processed"

# Day 3's tune.py selected min_frequency=50 against a 10,666-row training
# pool (patches 16.10-16.16) -- see artifacts/day3_training_config.json.
DAY3_TUNING_POOL_ROWS = 10666
DAY3_ABSOLUTE_MIN_FREQUENCY = 50
RELATIVE_MIN_FREQUENCY = DAY3_ABSOLUTE_MIN_FREQUENCY / DAY3_TUNING_POOL_ROWS

C = 0.01  # unchanged from Day 3, never retuned per tier
MIN_ROWS_PER_TIER_PATCH = 150  # a patch only qualifies as a shared TEST target if every tier clears this

COMMON_WINDOW_START, COMMON_WINDOW_END = "16.10", "16.17"  # bounded by Master+, the narrowest cohort

PATCH_INSPECTION_PATH = ARTIFACTS_DIR / "day5_controlled_patch_inspection.json"
CONFIG_PATH = ARTIFACTS_DIR / "day5_controlled_config.json"
FEATURE_SUPPORT_PATH = ARTIFACTS_DIR / "day5_controlled_feature_support.json"
COMPARISON_PATH = ARTIFACTS_DIR / "day5_controlled_comparison.json"

ORIGINAL_GOLD_MEAN_ROC_AUC = 0.5424  # from evaluate_cohorts.py's uncontrolled run, for the Step 10 delta


def load_all_cohorts() -> dict[str, pd.DataFrame]:
    cohorts = {}
    for name in ["gold", "platinum", "emerald", "diamond"]:
        path = PROCESSED_DIR / f"cohort_{name}.parquet"
        if path.exists():
            df = pd.read_parquet(path)
            if len(df) > 0:
                cohorts[name] = df
    cohorts["master_plus"] = load_dataset()
    return cohorts


def inspect_cohorts(cohorts: dict[str, pd.DataFrame]) -> dict:
    report = {}
    for name, df in cohorts.items():
        patches = sorted(df["patch"].unique(), key=patch_sort_key)
        report[name] = {
            "total_valid_matches": len(df),
            "earliest_patch": patches[0], "latest_patch": patches[-1],
            "n_distinct_patches": len(patches),
            "matches_per_patch": df["patch"].value_counts().to_dict(),
        }
        log.info("cohort=%s total=%d earliest=%s latest=%s n_patches=%d", name, len(df), patches[0], patches[-1], len(patches))

    # cross-cohort match_id overlap check
    all_ids = {name: set(df["match_id"]) for name, df in cohorts.items()}
    names = list(all_ids.keys())
    overlaps = {}
    for i, a in enumerate(names):
        for b in names[i+1:]:
            shared = all_ids[a] & all_ids[b]
            if shared:
                overlaps[f"{a}_vs_{b}"] = len(shared)
    report["cross_cohort_match_id_overlap"] = overlaps
    log.info("cross_cohort_match_id_overlap=%s", overlaps if overlaps else "none found")

    PATCH_INSPECTION_PATH.write_text(json.dumps(report, indent=2, default=str))
    log.info("patch_inspection_saved path=%s", PATCH_INSPECTION_PATH)
    return report


def restrict_to_common_window(cohorts: dict[str, pd.DataFrame]) -> dict[str, pd.DataFrame]:
    windowed = {}
    for name, df in cohorts.items():
        mask = df["patch"].apply(lambda p: patch_sort_key(COMMON_WINDOW_START) <= patch_sort_key(p) <= patch_sort_key(COMMON_WINDOW_END))
        windowed[name] = df[mask]
        log.info("cohort=%s rows_in_common_window(%s-%s)=%d (was %d)", name, COMMON_WINDOW_START, COMMON_WINDOW_END, len(windowed[name]), len(df))
    return windowed


def compute_shared_test_patches(windowed: dict[str, pd.DataFrame]) -> list[str]:
    all_patches = sorted(set().union(*[set(df["patch"].unique()) for df in windowed.values()]), key=patch_sort_key)
    shared = []
    for patch in all_patches:
        counts = {name: (df["patch"] == patch).sum() for name, df in windowed.items()}
        if all(c >= MIN_ROWS_PER_TIER_PATCH for c in counts.values()):
            shared.append(patch)
        else:
            log.info("patch=%s excluded_as_test_target counts=%s (threshold=%d)", patch, counts, MIN_ROWS_PER_TIER_PATCH)
    log.info("shared_test_patches=%s", shared)
    return shared


def build_shared_folds(shared_test_patches: list[str]) -> list[str]:
    """Just the list of shared test patches. Training always includes ALL
    patches strictly before a given test patch (from the FULL patch list,
    not just other shared test patches) -- same convention as
    temporal_eval.py. Computed directly in run_controlled_comparison via a
    '<' comparison, not by pairing against a "previous shared patch",
    which would incorrectly exclude non-shared-but-still-earlier patches
    (e.g. 16.14, excluded as a *test* target but still valid *training*
    data for the 16.15/16.16/16.17 folds)."""
    return shared_test_patches


def build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer([("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=True, min_frequency=RELATIVE_MIN_FREQUENCY), CHAMPION_COLUMNS)])
    return Pipeline([("preprocessing", preprocessor), ("classifier", LogisticRegression(C=C, solver="lbfgs", max_iter=1000, random_state=RANDOM_STATE))])


def feature_support_stats(train_df: pd.DataFrame) -> dict:
    long_counts = pd.concat([train_df[c].value_counts() for c in CHAMPION_COLUMNS])
    threshold = RELATIVE_MIN_FREQUENCY * len(train_df)
    below = long_counts < threshold
    return {
        "train_rows": len(train_df),
        "n_categories": len(long_counts),
        "effective_absolute_threshold": round(threshold, 2),
        "pct_collapsed": round(100 * below.mean(), 1),
        "median_occurrence": float(long_counts.median()),
        "p25_occurrence": float(long_counts.quantile(0.25)),
        "p75_occurrence": float(long_counts.quantile(0.75)),
    }


def evaluate_fold(train_df: pd.DataFrame, test_df: pd.DataFrame, name: str) -> dict:
    X_train, y_train = train_df[CHAMPION_COLUMNS], train_df["blue_win"].astype(int)
    X_test, y_test = test_df[CHAMPION_COLUMNS], test_df["blue_win"].astype(int)
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    proba = pipeline.predict_proba(X_test)[:, 1]
    metrics = compute_metrics(y_test, pd.Series(proba), name)
    metrics["proba_std"] = float(proba.std())
    return metrics


def run_controlled_comparison(windowed: dict[str, pd.DataFrame], shared_folds: list[tuple[str, str]]) -> dict:
    all_patches_sorted = sorted(set().union(*[set(df["patch"].unique()) for df in windowed.values()]), key=patch_sort_key)

    results = {}
    feature_support = {}
    for name, df in windowed.items():
        fold_results = []
        support_rows = []
        for test_patch in shared_folds:
            train_patches = [p for p in all_patches_sorted if patch_sort_key(p) < patch_sort_key(test_patch)]
            train_df = df[df["patch"].isin(train_patches)]
            test_df = df[df["patch"] == test_patch]
            if len(train_df) == 0 or len(test_df) == 0:
                log.warning("cohort=%s fold test=%s SKIPPED (empty train or test)", name, test_patch)
                continue
            assert set(train_df["match_id"]).isdisjoint(set(test_df["match_id"]))

            support = feature_support_stats(train_df)
            support_rows.append({"train_patches": train_patches, "test_patch": test_patch, **support})

            metrics = evaluate_fold(train_df, test_df, f"{name}_{test_patch}")
            fold_results.append({"train_patches": train_patches, "test_patch": test_patch, "train_rows": len(train_df), "test_rows": len(test_df), **metrics})
            log.info("cohort=%s fold train_through=%s test=%s train_rows=%d roc_auc=%.4f log_loss=%.4f pct_collapsed=%.1f%%",
                      name, train_patches[-1] if train_patches else None, test_patch, len(train_df), metrics["roc_auc"], metrics["log_loss"], support["pct_collapsed"])

        feature_support[name] = support_rows
        if fold_results:
            roc_aucs = [f["roc_auc"] for f in fold_results]
            log_losses = [f["log_loss"] for f in fold_results]
            briers = [f["brier_score"] for f in fold_results]
            accs = [f["accuracy"] for f in fold_results]
            proba_stds = [f["proba_std"] for f in fold_results]
            results[name] = {
                "folds": fold_results,
                "summary": {
                    "n_folds": len(fold_results),
                    "mean_roc_auc": float(np.mean(roc_aucs)), "std_roc_auc": float(np.std(roc_aucs)),
                    "mean_log_loss": float(np.mean(log_losses)), "std_log_loss": float(np.std(log_losses)),
                    "mean_brier": float(np.mean(briers)), "std_brier": float(np.std(briers)),
                    "mean_accuracy": float(np.mean(accs)),
                    "mean_proba_std": float(np.mean(proba_stds)),
                    "mean_pct_collapsed": float(np.mean([s["pct_collapsed"] for s in support_rows])),
                },
            }

    FEATURE_SUPPORT_PATH.write_text(json.dumps(feature_support, indent=2, default=str))
    log.info("feature_support_saved path=%s", FEATURE_SUPPORT_PATH)
    return results


def run() -> None:
    cohorts = load_all_cohorts()
    log.info("cohorts_available=%s", list(cohorts.keys()))

    inspect_cohorts(cohorts)
    windowed = restrict_to_common_window(cohorts)
    shared_test_patches = compute_shared_test_patches(windowed)
    shared_folds = build_shared_folds(shared_test_patches)

    # sanity-check the relative-threshold derivation against its own basis
    effective_at_basis = RELATIVE_MIN_FREQUENCY * DAY3_TUNING_POOL_ROWS
    log.info("relative_min_frequency=%.6f effective_at_day3_basis=%.2f (should be ~%d)", RELATIVE_MIN_FREQUENCY, effective_at_basis, DAY3_ABSOLUTE_MIN_FREQUENCY)

    config = {
        "common_window": [COMMON_WINDOW_START, COMMON_WINDOW_END],
        "shared_test_patches": shared_test_patches,
        "shared_test_patches_used_as_folds": shared_folds,
        "C": C,
        "relative_min_frequency": RELATIVE_MIN_FREQUENCY,
        "relative_min_frequency_derivation": f"{DAY3_ABSOLUTE_MIN_FREQUENCY} / {DAY3_TUNING_POOL_ROWS} (Day 3's tune.py training pool size)",
        "min_rows_per_tier_patch_threshold": MIN_ROWS_PER_TIER_PATCH,
        "random_state": RANDOM_STATE,
    }
    CONFIG_PATH.write_text(json.dumps(config, indent=2, default=str))
    log.info("config_saved path=%s", CONFIG_PATH)

    results = run_controlled_comparison(windowed, shared_folds)

    log.info("=" * 110)
    log.info("%-14s %10s %10s %10s %10s %10s %14s", "Tier", "Rows", "ROC-AUC", "LogLoss", "Brier", "ROC-AUC±", "AvgCollapsed%")
    for name, r in results.items():
        s = r["summary"]
        log.info("%-14s %10d %10.4f %10.4f %10.4f %10.4f %14.1f",
                  name, len(windowed[name]),
                  s["mean_roc_auc"], s["mean_log_loss"], s["mean_brier"], s["std_roc_auc"], s["mean_pct_collapsed"])
    log.info("=" * 110)

    if "gold" in results:
        gold_delta = results["gold"]["summary"]["mean_roc_auc"] - ORIGINAL_GOLD_MEAN_ROC_AUC
        log.info("gold_roc_auc_change: original=%.4f controlled=%.4f delta=%+.4f", ORIGINAL_GOLD_MEAN_ROC_AUC, results["gold"]["summary"]["mean_roc_auc"], gold_delta)

    COMPARISON_PATH.write_text(json.dumps({"config": config, "results": results, "original_gold_mean_roc_auc": ORIGINAL_GOLD_MEAN_ROC_AUC}, indent=2, default=str))
    log.info("comparison_saved path=%s", COMPARISON_PATH)


if __name__ == "__main__":
    run()

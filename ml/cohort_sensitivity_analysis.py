"""
Day 5 sensitivity analysis: the strict controlled comparison
(MIN_ROWS_PER_TIER_PATCH=150) found ZERO shared test patches across all
5 tiers -- Emerald's 149 rows in patch 16.15 misses by one row. That is
reported as the primary finding, not replaced.

This script separately checks whether the apparent skill-tier ordering
seen in earlier partial comparisons is robust to that admittedly
arbitrary 150-row cutoff, by testing a small predefined set of
alternative thresholds (150/140/125/100). Same model, same relative
min_frequency, same window -- nothing is retuned per threshold. The
question is robustness, not searching for a threshold that produces a
particular-looking result.
"""

from __future__ import annotations

import json
import logging

import numpy as np
import pandas as pd

from evaluate_cohorts_controlled import (
    C,
    COMPARISON_PATH,
    RELATIVE_MIN_FREQUENCY,
    build_pipeline,
    evaluate_fold,
    feature_support_stats,
    load_all_cohorts,
    restrict_to_common_window,
)
from train import ARTIFACTS_DIR, patch_sort_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("cohort_sensitivity_analysis")

OUTPUT_PATH = ARTIFACTS_DIR / "day5_controlled_sensitivity_analysis.json"
THRESHOLDS = [150, 140, 125, 100]

# Order implied by the earlier n=1, 4-tier check -- used only to measure
# directional agreement, never to select or exclude thresholds/folds.
REFERENCE_ORDER = ["gold", "platinum", "emerald", "diamond", "master_plus"]


def compute_shared_test_patches(windowed: dict[str, pd.DataFrame], threshold: int) -> list[str]:
    all_patches = sorted(set().union(*[set(df["patch"].unique()) for df in windowed.values()]), key=patch_sort_key)
    shared = []
    for patch in all_patches:
        counts = {name: int((df["patch"] == patch).sum()) for name, df in windowed.items()}
        if all(c >= threshold for c in counts.values()):
            shared.append(patch)
    return shared


def evaluate_at_threshold(windowed: dict[str, pd.DataFrame], threshold: int) -> dict:
    all_patches_sorted = sorted(set().union(*[set(df["patch"].unique()) for df in windowed.values()]), key=patch_sort_key)
    shared_test_patches = compute_shared_test_patches(windowed, threshold)

    if not shared_test_patches:
        log.info("threshold=%d shared_folds=0", threshold)
        return {"threshold": threshold, "n_folds": 0, "shared_test_patches": [], "folds": []}

    fold_reports = []
    for test_patch in shared_test_patches:
        train_patches = [p for p in all_patches_sorted if patch_sort_key(p) < patch_sort_key(test_patch)]
        tier_results = {}
        for name, df in windowed.items():
            train_df = df[df["patch"].isin(train_patches)]
            test_df = df[df["patch"] == test_patch]
            if len(train_df) == 0 or len(test_df) == 0:
                continue
            metrics = evaluate_fold(train_df, test_df, f"{name}_{test_patch}_thresh{threshold}")
            support = feature_support_stats(train_df)
            tier_results[name] = {"train_rows": len(train_df), "test_rows": len(test_df), "roc_auc": metrics["roc_auc"], "log_loss": metrics["log_loss"], "brier_score": metrics["brier_score"], "pct_collapsed": support["pct_collapsed"]}

        observed_order = sorted(tier_results.keys(), key=lambda n: tier_results[n]["roc_auc"])
        reference_present = [t for t in REFERENCE_ORDER if t in tier_results]
        directionally_consistent = observed_order == reference_present

        fold_reports.append({
            "test_patch": test_patch,
            "tiers": tier_results,
            "roc_auc_ascending_order": observed_order,
            "reference_order": reference_present,
            "directionally_consistent_with_reference": directionally_consistent,
        })
        log.info(
            "threshold=%d test=%s order=%s matches_reference=%s",
            threshold, test_patch, observed_order, directionally_consistent,
        )

    return {"threshold": threshold, "n_folds": len(fold_reports), "shared_test_patches": shared_test_patches, "folds": fold_reports}


def run() -> None:
    strict_result = json.loads(COMPARISON_PATH.read_text())
    strict_n_folds = len(strict_result["config"]["shared_test_patches"])
    log.info("PRIMARY FINDING (threshold=150, from existing day5_controlled_comparison.json): shared_folds=%d", strict_n_folds)
    assert strict_n_folds == 0, "expected the strict 150-threshold result to have 0 shared folds -- if this changed, the primary finding needs updating, not silently overridden"

    cohorts = load_all_cohorts()
    windowed = restrict_to_common_window(cohorts)

    sensitivity_results = []
    for threshold in THRESHOLDS:
        if threshold == 150:
            sensitivity_results.append({"threshold": 150, "n_folds": 0, "shared_test_patches": [], "folds": [], "note": "reused from day5_controlled_comparison.json (primary finding), not recomputed"})
            continue
        result = evaluate_at_threshold(windowed, threshold)
        sensitivity_results.append(result)

    log.info("=" * 100)
    log.info("SENSITIVITY SUMMARY")
    for r in sensitivity_results:
        n_consistent = sum(1 for f in r["folds"] if f.get("directionally_consistent_with_reference"))
        log.info("threshold=%-4d n_folds=%d test_patches=%s folds_matching_reference_order=%d/%d",
                  r["threshold"], r["n_folds"], r["shared_test_patches"], n_consistent, r["n_folds"])
    log.info("=" * 100)

    OUTPUT_PATH.write_text(json.dumps({
        "primary_finding": {"threshold": 150, "n_shared_folds": strict_n_folds, "source": str(COMPARISON_PATH)},
        "reference_order_basis": "n=1, 4-tier check with Emerald (Gold<Platinum<Emerald<Master+)",
        "fixed_config": {"C": C, "relative_min_frequency": RELATIVE_MIN_FREQUENCY, "common_window": ["16.10", "16.17"]},
        "thresholds_tested": THRESHOLDS,
        "results": sensitivity_results,
    }, indent=2, default=str))
    log.info("sensitivity_analysis_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    run()

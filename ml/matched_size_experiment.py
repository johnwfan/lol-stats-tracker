"""
Day 5 controlled rerun, Step 11: even after fixing patch range and
rare-category handling, Master+'s shared-fold training sets remain
~13x larger than Gold's (13,389 vs 1,016 rows on the largest fold). This
checks whether Master+'s apparent performance is partly just a
"more rows" effect: for each fold, Master+'s training data is randomly
subsampled down to Gold's exact training size for that same fold, repeated
with 5 different fixed seeds, and averaged -- isolating population from
sample size.
"""

from __future__ import annotations

import json
import logging

import numpy as np
import pandas as pd

from evaluate import compute_metrics
from evaluate_cohorts_controlled import (
    COMPARISON_PATH,
    RELATIVE_MIN_FREQUENCY,
    build_pipeline,
    load_all_cohorts,
    restrict_to_common_window,
)
from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, patch_sort_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("matched_size_experiment")

OUTPUT_PATH = ARTIFACTS_DIR / "day5_controlled_matched_size_experiment.json"
N_REPEATS = 5
SEEDS = [42, 43, 44, 45, 46]


def evaluate_subsampled_fold(train_df: pd.DataFrame, test_df: pd.DataFrame, target_size: int, seed: int) -> dict:
    sampled = train_df.sample(n=target_size, random_state=seed) if len(train_df) > target_size else train_df
    X_train, y_train = sampled[CHAMPION_COLUMNS], sampled["blue_win"].astype(int)
    X_test, y_test = test_df[CHAMPION_COLUMNS], test_df["blue_win"].astype(int)
    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    proba = pipeline.predict_proba(X_test)[:, 1]
    return compute_metrics(y_test, pd.Series(proba), f"matched_seed{seed}")


def run() -> None:
    if not COMPARISON_PATH.exists():
        raise FileNotFoundError(f"{COMPARISON_PATH} not found -- run evaluate_cohorts_controlled.py first")
    controlled = json.loads(COMPARISON_PATH.read_text())
    shared_test_patches = controlled["config"]["shared_test_patches"]

    cohorts = load_all_cohorts()
    windowed = restrict_to_common_window(cohorts)
    all_patches_sorted = sorted(set().union(*[set(df["patch"].unique()) for df in windowed.values()]), key=patch_sort_key)

    if "gold" not in windowed:
        log.warning("gold cohort not available -- nothing to match against, skipping")
        return

    fold_results = []
    for test_patch in shared_test_patches:
        train_patches = [p for p in all_patches_sorted if patch_sort_key(p) < patch_sort_key(test_patch)]

        gold_train = windowed["gold"][windowed["gold"]["patch"].isin(train_patches)]
        target_size = len(gold_train)

        master_train = windowed["master_plus"][windowed["master_plus"]["patch"].isin(train_patches)]
        master_test = windowed["master_plus"][windowed["master_plus"]["patch"] == test_patch]

        if len(master_train) <= target_size:
            log.info("test=%s master_plus_train_rows=%d <= gold_train_rows=%d -- no subsampling needed/possible, skipping", test_patch, len(master_train), target_size)
            continue

        repeat_metrics = []
        for seed in SEEDS:
            m = evaluate_subsampled_fold(master_train, master_test, target_size, seed)
            repeat_metrics.append(m)

        roc_aucs = [m["roc_auc"] for m in repeat_metrics]
        log_losses = [m["log_loss"] for m in repeat_metrics]
        fold_summary = {
            "test_patch": test_patch,
            "target_train_size": target_size,
            "master_plus_original_train_size": len(master_train),
            "n_repeats": N_REPEATS,
            "mean_roc_auc": float(np.mean(roc_aucs)), "std_roc_auc": float(np.std(roc_aucs)),
            "mean_log_loss": float(np.mean(log_losses)), "std_log_loss": float(np.std(log_losses)),
            "per_seed": repeat_metrics,
        }
        fold_results.append(fold_summary)
        log.info(
            "test=%s target_size=%d (subsampled from %d) mean_roc_auc=%.4f (±%.4f across %d seeds) mean_log_loss=%.4f",
            test_patch, target_size, len(master_train), fold_summary["mean_roc_auc"], fold_summary["std_roc_auc"], N_REPEATS, fold_summary["mean_log_loss"],
        )

    if not fold_results:
        log.warning("no folds required subsampling (master_plus was never larger than gold) -- nothing to report")
        return

    overall_mean_roc_auc = float(np.mean([f["mean_roc_auc"] for f in fold_results]))
    overall_mean_log_loss = float(np.mean([f["mean_log_loss"] for f in fold_results]))
    gold_mean_roc_auc = controlled["results"]["gold"]["summary"]["mean_roc_auc"]
    master_full_mean_roc_auc = controlled["results"]["master_plus"]["summary"]["mean_roc_auc"]

    log.info("=" * 100)
    log.info("Size-matched Master+ mean ROC-AUC: %.4f (full-size Master+ was %.4f, Gold was %.4f)",
              overall_mean_roc_auc, master_full_mean_roc_auc, gold_mean_roc_auc)
    log.info(
        "Interpretation: if size-matched Master+ stays close to full-size Master+ (%.4f) and still beats Gold (%.4f), "
        "the Gold-vs-Master+ gap is a population effect, not a sample-size effect. If size-matched Master+ drops "
        "toward Gold's level, sample size is a major confound even after the other fixes.",
        master_full_mean_roc_auc, gold_mean_roc_auc,
    )
    log.info("=" * 100)

    OUTPUT_PATH.write_text(json.dumps({
        "seeds": SEEDS, "n_repeats": N_REPEATS,
        "folds": fold_results,
        "overall_size_matched_master_plus_mean_roc_auc": overall_mean_roc_auc,
        "overall_size_matched_master_plus_mean_log_loss": overall_mean_log_loss,
        "full_size_master_plus_mean_roc_auc": master_full_mean_roc_auc,
        "gold_mean_roc_auc": gold_mean_roc_auc,
    }, indent=2, default=str))
    log.info("matched_size_experiment_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    run()

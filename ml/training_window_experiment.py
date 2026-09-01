"""
Day 3.5, Step 6: does adding older patches to training help (more sample
size) or hurt (stale meta information) when predicting the same fixed
target patch (16.17, the newest)? Same fixed config as temporal_eval.py,
same target, only the training window's length varies.
"""

from __future__ import annotations

import json
import logging

import pandas as pd

from evaluate import compute_metrics
from temporal_eval import FIXED_CONFIG, fit_predict_evaluate
from train import ARTIFACTS_DIR, load_dataset, patch_sort_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("training_window_experiment")

OUTPUT_PATH = ARTIFACTS_DIR / "day3_5_training_window_experiment.json"


def build_windows(df: pd.DataFrame, target_patch: str) -> dict[str, list[str]]:
    patches = sorted(df["patch"].unique(), key=patch_sort_key)
    history = [p for p in patches if patch_sort_key(p) < patch_sort_key(target_patch)]
    return {
        "A_all_history": history,
        "B_recent_4": history[-4:],
        "C_recent_3": history[-3:],
        "D_recent_2": history[-2:],
        "E_recent_1": history[-1:],
    }


def run_experiment(target_patch: str = "16.17") -> None:
    df = load_dataset()
    windows = build_windows(df, target_patch)
    test_df = df[df["patch"] == target_patch]

    results = {}
    for name, train_patches in windows.items():
        train_df = df[df["patch"].isin(train_patches)]
        metrics, _ = fit_predict_evaluate(train_df, test_df)
        results[name] = {
            "train_patches": train_patches,
            "train_rows": len(train_df),
            **metrics,
        }
        log.info(
            "window=%-14s train_patches=%-30s train_rows=%5d roc_auc=%.4f log_loss=%.4f brier=%.4f proba_range=%.3f-%.3f",
            name, train_patches, len(train_df), metrics["roc_auc"], metrics["log_loss"], metrics["brier_score"],
            metrics["proba_min"], metrics["proba_max"],
        )

    OUTPUT_PATH.write_text(json.dumps({
        "target_patch": target_patch,
        "test_rows": len(test_df),
        "fixed_config": FIXED_CONFIG,
        "windows": results,
    }, indent=2, default=str))
    log.info("training_window_experiment_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    run_experiment()

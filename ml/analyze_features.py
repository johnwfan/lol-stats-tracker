"""
Day 3, Step 3: quantifies how severe the one-hot feature sparsity problem
actually is, and cross-references it against Day 2's reported top
coefficients.

Imports load_dataset/split_by_patch/CHAMPION_COLUMNS from train.py rather
than redefining them -- this is real split *behavior*, not a harmless
constant, and duplicating it risks the analysis silently drifting out of
sync with what train.py actually fits on.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import pandas as pd

from train import ARTIFACTS_DIR as DAY2_ARTIFACTS_DIR
from train import CHAMPION_COLUMNS, load_dataset, split_by_patch

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("analyze_features")

OUTPUT_PATH = DAY2_ARTIFACTS_DIR / "day3_feature_frequency_analysis.json"
DAY2_METRICS_PATH = DAY2_ARTIFACTS_DIR / "metrics.json"
FREQUENCY_THRESHOLDS = [5, 10, 20, 50]


def count_feature_occurrences(train_df: pd.DataFrame) -> pd.DataFrame:
    """One row per (role_column, champion) feature that actually occurs in
    training data, with its occurrence count -- the same unit of counting
    as a one-hot feature/coefficient."""
    long_rows = []
    for col in CHAMPION_COLUMNS:
        counts = train_df[col].value_counts()
        for champion, count in counts.items():
            long_rows.append({"role_column": col, "champion": champion, "count": int(count)})
    return pd.DataFrame(long_rows)


def cross_reference_day2_coefficients(feature_counts: pd.DataFrame) -> dict | None:
    """If Day 2's metrics.json exists, look up the training occurrence count
    for each of its reported top positive/negative coefficients -- turning
    the 6-example spot-check from Day 2's writeup into a complete check
    against everything Day 2 actually reported."""
    if not DAY2_METRICS_PATH.exists():
        log.warning("day2_metrics_not_found path=%s -- skipping coefficient cross-reference", DAY2_METRICS_PATH)
        return None

    day2 = json.loads(DAY2_METRICS_PATH.read_text())
    lookup = feature_counts.set_index(["role_column", "champion"])["count"].to_dict()

    def annotate(coef_list):
        annotated = []
        for row in coef_list:
            key = (row["role_column"], row["champion"])
            annotated.append({**row, "training_occurrences": lookup.get(key)})
        return annotated

    positives = annotate(day2["top_positive_coefficients"])
    negatives = annotate(day2["top_negative_coefficients"])
    all_counts = [r["training_occurrences"] for r in positives + negatives if r["training_occurrences"] is not None]

    return {
        "top_positive": positives,
        "top_negative": negatives,
        "n_below_10_occurrences": sum(1 for c in all_counts if c < 10),
        "n_total_checked": len(all_counts),
        "median_occurrences": float(pd.Series(all_counts).median()) if all_counts else None,
    }


def analyze() -> None:
    df = load_dataset()
    train_df, _ = split_by_patch(df)

    feature_counts = count_feature_occurrences(train_df)
    n_features = len(feature_counts)
    n_train_rows = len(train_df)

    log.info("feature_count n_features=%d n_train_rows=%d ratio_rows_per_feature=%.3f",
              n_features, n_train_rows, n_train_rows / n_features)

    threshold_report = {}
    for t in FREQUENCY_THRESHOLDS:
        below = (feature_counts["count"] < t).sum()
        pct = 100 * below / n_features
        threshold_report[f"below_{t}"] = {"count": int(below), "pct": round(pct, 1)}
        log.info("threshold t=%d features_below=%d pct=%.1f%%", t, below, pct)

    distribution = feature_counts["count"].describe().to_dict()
    log.info("count_distribution min=%s p25=%s median=%s p75=%s max=%s",
              distribution["min"], distribution["25%"], distribution["50%"], distribution["75%"], distribution["max"])

    day2_cross_ref = cross_reference_day2_coefficients(feature_counts)
    if day2_cross_ref:
        log.info(
            "day2_coefficient_cross_reference n_checked=%d n_below_10_occurrences=%d median_occurrences=%s",
            day2_cross_ref["n_total_checked"], day2_cross_ref["n_below_10_occurrences"], day2_cross_ref["median_occurrences"],
        )

    report = {
        "n_train_rows": n_train_rows,
        "n_features": n_features,
        "rows_per_feature_ratio": n_train_rows / n_features,
        "frequency_thresholds": threshold_report,
        "count_distribution": distribution,
        "day2_coefficient_cross_reference": day2_cross_ref,
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2, default=str))
    log.info("analysis_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    analyze()

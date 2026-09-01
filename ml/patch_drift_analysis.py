"""
Day 3.5, Step 7: descriptive check of whether champion-role win-rate
patterns actually shift between adjacent patches enough to plausibly
explain the weak/unstable forward-generalization seen in temporal_eval.py.
No new features are built here -- this only informs whether concept drift
is a credible explanation.
"""

from __future__ import annotations

import json
import logging

import pandas as pd

from train import ARTIFACTS_DIR, CHAMPION_COLUMNS, load_dataset, patch_sort_key

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("patch_drift_analysis")

OUTPUT_PATH = ARTIFACTS_DIR / "day3_5_patch_drift_analysis.json"
MIN_OCCURRENCES_BOTH_PATCHES = 30  # avoid small-sample noise in win-rate deltas
LARGE_SWING_THRESHOLD = 0.15  # 15 percentage points


def champion_role_win_rates(df: pd.DataFrame) -> pd.DataFrame:
    """One row per (role_column, champion, patch) with count and win rate,
    counting each side's picks for that role column separately (a champion
    picked blue_top counts toward blue_top's win rate using blue_win, and
    red_top counts toward red_top's win rate using (not blue_win))."""
    rows = []
    for col in CHAMPION_COLUMNS:
        side_win = df["blue_win"] if col.startswith("blue_") else ~df["blue_win"]
        sub = pd.DataFrame({"champion": df[col], "patch": df["patch"], "win": side_win})
        grouped = sub.groupby(["patch", "champion"])["win"].agg(["count", "mean"]).reset_index()
        grouped["role_column"] = col
        rows.append(grouped)
    return pd.concat(rows, ignore_index=True).rename(columns={"mean": "win_rate"})


def adjacent_patch_drift(win_rates: pd.DataFrame, patch_a: str, patch_b: str) -> dict:
    a = win_rates[win_rates["patch"] == patch_a]
    b = win_rates[win_rates["patch"] == patch_b]
    merged = a.merge(b, on=["role_column", "champion"], suffixes=("_a", "_b"))
    merged = merged[(merged["count_a"] >= MIN_OCCURRENCES_BOTH_PATCHES) & (merged["count_b"] >= MIN_OCCURRENCES_BOTH_PATCHES)]

    if merged.empty:
        return {"patch_a": patch_a, "patch_b": patch_b, "n_combos_compared": 0, "note": "no combos met the minimum occurrence threshold in both patches"}

    merged["win_rate_delta"] = merged["win_rate_b"] - merged["win_rate_a"]
    large_swings = merged[merged["win_rate_delta"].abs() >= LARGE_SWING_THRESHOLD]
    top_examples = merged.reindex(merged["win_rate_delta"].abs().sort_values(ascending=False).index).head(5)

    return {
        "patch_a": patch_a,
        "patch_b": patch_b,
        "n_combos_compared": len(merged),
        "mean_abs_win_rate_delta": float(merged["win_rate_delta"].abs().mean()),
        "n_large_swings_over_15pp": int(len(large_swings)),
        "pct_large_swings": round(100 * len(large_swings) / len(merged), 1),
        "top_5_examples": [
            {
                "role_column": r.role_column, "champion": r.champion,
                f"win_rate_{patch_a}": round(r.win_rate_a, 3), f"count_{patch_a}": int(r.count_a),
                f"win_rate_{patch_b}": round(r.win_rate_b, 3), f"count_{patch_b}": int(r.count_b),
                "delta": round(r.win_rate_delta, 3),
            }
            for r in top_examples.itertuples()
        ],
    }


def pick_popularity_turnover(df: pd.DataFrame, patch_a: str, patch_b: str) -> dict:
    """Top-10 most-picked champions (across all 10 role columns pooled) per
    patch, and how much the two top-10 lists overlap."""
    def top10(patch):
        sub = df[df["patch"] == patch]
        counts = pd.concat([sub[c] for c in CHAMPION_COLUMNS]).value_counts()
        return list(counts.head(10).index)

    a_top10, b_top10 = top10(patch_a), top10(patch_b)
    overlap = set(a_top10) & set(b_top10)
    return {
        "patch_a": patch_a, "patch_b": patch_b,
        f"top10_{patch_a}": a_top10, f"top10_{patch_b}": b_top10,
        "overlap_count": len(overlap), "overlap_pct": round(100 * len(overlap) / 10, 1),
    }


def analyze() -> None:
    df = load_dataset()
    win_rates = champion_role_win_rates(df)

    patches = sorted(df["patch"].unique(), key=patch_sort_key)
    # Only compare pairs with enough rows for the min-occurrence threshold to be meaningful.
    counts = df["patch"].value_counts()
    comparable_patches = [p for p in patches if counts[p] >= 1000]
    adjacent_pairs = list(zip(comparable_patches, comparable_patches[1:]))

    drift_results = []
    turnover_results = []
    for patch_a, patch_b in adjacent_pairs:
        drift = adjacent_patch_drift(win_rates, patch_a, patch_b)
        drift_results.append(drift)
        log.info(
            "drift %s->%s n_combos=%d mean_abs_delta=%.3f large_swings=%d (%.1f%%)",
            patch_a, patch_b, drift.get("n_combos_compared", 0), drift.get("mean_abs_win_rate_delta", 0),
            drift.get("n_large_swings_over_15pp", 0), drift.get("pct_large_swings", 0),
        )

        turnover = pick_popularity_turnover(df, patch_a, patch_b)
        turnover_results.append(turnover)
        log.info("popularity_turnover %s->%s top10_overlap=%d/10", patch_a, patch_b, turnover["overlap_count"])

    overall_blue_win_by_patch = df.groupby("patch")["blue_win"].mean().to_dict()

    report = {
        "min_occurrences_both_patches": MIN_OCCURRENCES_BOTH_PATCHES,
        "large_swing_threshold_pp": LARGE_SWING_THRESHOLD,
        "adjacent_patch_win_rate_drift": drift_results,
        "pick_popularity_turnover": turnover_results,
        "overall_blue_win_rate_by_patch": {k: round(v, 4) for k, v in overall_blue_win_by_patch.items()},
    }
    OUTPUT_PATH.write_text(json.dumps(report, indent=2, default=str))
    log.info("drift_analysis_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    analyze()

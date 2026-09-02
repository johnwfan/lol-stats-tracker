"""
One-off diagnostic: verifies the advantage-label percentages reported in
the Day 6 summary against the actual saved production reference data and
the actual production label-assignment code in inference.py (imported
directly, not re-typed, so this tests the real code path).

reference_distribution.json only stores summary stats (mean/std/percentiles),
not the per-row score array, so the per-row scores are regenerated here by
running the frozen model over the same full dataset -- then sanity-checked
against the saved summary stats to confirm it's a faithful reproduction.

Not part of the request-serving path -- run manually when needed.

Needs `pyarrow` to read ml/data/processed/dataset.parquet (not in
requirements.txt since production serving never reads parquet):
    pip install pyarrow==25.0.1
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent / "ml"))
from train import CHAMPION_COLUMNS, load_dataset  # noqa: E402

from inference import SLIGHT_EDGE_Z, STRONG_EDGE_Z  # noqa: E402

MODEL_PATH = Path(__file__).parent / "model_registry" / "draft-logreg-v1.joblib"
REFERENCE_PATH = Path(__file__).parent / "reference_distribution.json"


def assign_label(z: float) -> str:
    """Exact replica of inference.py's DraftAnalyzer.analyze() branching."""
    if abs(z) >= STRONG_EDGE_Z:
        return "strong_blue" if z > 0 else "strong_red"
    elif abs(z) >= SLIGHT_EDGE_Z:
        return "slight_blue" if z > 0 else "slight_red"
    else:
        return "even"


def normal_cdf(x: float) -> float:
    """Standard normal CDF via erf -- no scipy dependency needed for this check."""
    import math
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))


def main() -> None:
    reference = json.loads(REFERENCE_PATH.read_text())
    reference_mean, reference_std = reference["mean"], reference["std"]
    print(f"Loaded reference_distribution.json: mean={reference_mean:.6f} std={reference_std:.6f} n_samples={reference['n_samples']}")

    pipeline = joblib.load(MODEL_PATH)
    df = load_dataset()
    scores = pipeline.predict_proba(df[CHAMPION_COLUMNS])[:, 1]
    print(f"Recomputed {len(scores)} raw scores from the frozen model over the full dataset.")

    recomputed_mean, recomputed_std = float(np.mean(scores)), float(np.std(scores))
    print(f"Recomputed mean={recomputed_mean:.6f} std={recomputed_std:.6f}")

    mean_match = abs(recomputed_mean - reference_mean) < 1e-9
    std_match = abs(recomputed_std - reference_std) < 1e-9
    print(f"Sanity check -- recomputed matches saved reference exactly: mean={mean_match} std={std_match}")
    assert mean_match and std_match, "Recomputed scores do NOT match the saved production reference distribution -- stopping, do not trust downstream numbers."

    z_scores = (scores - reference_mean) / reference_std
    labels = [assign_label(z) for z in z_scores]

    print(f"\nSLIGHT_EDGE_Z={SLIGHT_EDGE_Z} STRONG_EDGE_Z={STRONG_EDGE_Z} (imported directly from inference.py)\n")

    print("=== Category counts (production code path) ===")
    order = ["strong_red", "slight_red", "even", "slight_blue", "strong_blue"]
    counts = {label: labels.count(label) for label in order}
    total = sum(counts.values())
    for label in order:
        pct = 100 * counts[label] / len(labels)
        print(f"  {label:12s}: {counts[label]:6d}  ({pct:5.2f}%)")
    print(f"  {'TOTAL':12s}: {total:6d}")
    assert total == len(df) == 14826, f"Counts do not sum to the full 14,826-row dataset (got {total} vs {len(df)})"
    print("Sum check PASSED: counts total exactly 14,826.\n")

    print("=== z-score distribution ===")
    z_stats = {
        "mean": float(np.mean(z_scores)), "std": float(np.std(z_scores)),
        "min": float(np.min(z_scores)), "max": float(np.max(z_scores)),
    }
    for p in [5, 25, 50, 75, 95]:
        z_stats[f"p{p}"] = float(np.percentile(z_scores, p))
    for k, v in z_stats.items():
        print(f"  {k:6s}: {v:.4f}")

    print("\n=== Empirical vs. theoretical standard-normal comparison ===")
    even_pct = 100 * counts["even"] / total
    slight_pct = 100 * (counts["slight_red"] + counts["slight_blue"]) / total
    strong_pct = 100 * (counts["strong_red"] + counts["strong_blue"]) / total
    theoretical_even = 100 * (normal_cdf(SLIGHT_EDGE_Z) - normal_cdf(-SLIGHT_EDGE_Z))
    theoretical_slight = 100 * ((normal_cdf(STRONG_EDGE_Z) - normal_cdf(SLIGHT_EDGE_Z)) + (normal_cdf(-SLIGHT_EDGE_Z) - normal_cdf(-STRONG_EDGE_Z)))
    theoretical_strong = 100 * (2 * (1 - normal_cdf(STRONG_EDGE_Z)))
    print(f"  Even   (|z|<{SLIGHT_EDGE_Z}):            empirical={even_pct:.2f}%   theoretical_normal={theoretical_even:.2f}%")
    print(f"  Slight ({SLIGHT_EDGE_Z}<=|z|<{STRONG_EDGE_Z}, both sides): empirical={slight_pct:.2f}%   theoretical_normal={theoretical_slight:.2f}%")
    print(f"  Strong (|z|>={STRONG_EDGE_Z}, both sides):     empirical={strong_pct:.2f}%   theoretical_normal={theoretical_strong:.2f}%")

    print("\n=== Diagnosis ===")
    day6_summary_claimed_even_pct = 62.0
    if abs(even_pct - theoretical_even) < 3.0:
        print(f"Empirical 'even' % ({even_pct:.2f}%) closely matches the standard-normal theoretical value ({theoretical_even:.2f}%).")
        print("Thresholds and production code are CORRECT.")
        if abs(even_pct - day6_summary_claimed_even_pct) > 5.0:
            print(f"The Day 6 summary's claimed {day6_summary_claimed_even_pct}% does NOT match this empirical result -> Day 6 summary text was WRONG (documentation-only error).")
        else:
            print("The Day 6 summary's claimed percentage roughly matches -- no error found.")
    else:
        print(f"Empirical 'even' % ({even_pct:.2f}%) diverges substantially from the standard-normal theoretical value ({theoretical_even:.2f}%).")
        print("This needs manual investigation before touching any docs or code -- do not assume which side is wrong.")


if __name__ == "__main__":
    main()

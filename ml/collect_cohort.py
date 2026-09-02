"""
Day 5, Part B: collects sub-apex skill-tier cohorts (Gold/Platinum/Emerald/
Diamond) using the exact same fetch/resume/rate-limit machinery as the
main collector -- only the seed source and output location differ.

Master+ is NOT collected here: the existing 14,826-match dataset already
IS that population, reused as-is (see ml/evaluate_cohorts.py).

Each cohort writes to its own raw dir and seeds-state file, so cohorts
never mix with each other or with the main dataset. Sampling from a
middle division (II) per tier rather than division I (bordering the next
tier up) or IV (bordering the tier below) to avoid skewing a cohort
toward its neighboring tier.
"""

from __future__ import annotations

import logging
from pathlib import Path

from collect import collect

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("collect_cohort")

DATA_DIR = Path(__file__).parent / "data"
STATE_DIR = DATA_DIR / "state"

COHORT_TARGET_MATCHES = 3000

COHORTS = {
    "gold": ("GOLD", "II"),
    "platinum": ("PLATINUM", "II"),
    "emerald": ("EMERALD", "II"),
    "diamond": ("DIAMOND", "II"),
}


def collect_cohort(name: str, tier: str, division: str) -> None:
    raw_dir = DATA_DIR / f"raw_cohort_{name}"
    seeds_file = STATE_DIR / f"seeds_queried_cohort_{name}.json"
    log.info("cohort_collection_starting name=%s tier=%s division=%s target=%d", name, tier, division, COHORT_TARGET_MATCHES)
    collect(
        raw_dir=raw_dir,
        seeds_file=seeds_file,
        target_match_count=COHORT_TARGET_MATCHES,
        seed_source="division",
        division_tier=tier,
        division=division,
    )


def collect_all_cohorts() -> None:
    for name, (tier, division) in COHORTS.items():
        collect_cohort(name, tier, division)
    log.info("all_cohorts_complete cohorts=%s", list(COHORTS.keys()))


if __name__ == "__main__":
    collect_all_cohorts()

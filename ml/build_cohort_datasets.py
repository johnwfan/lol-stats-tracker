"""
Day 5, Part B: builds a processed dataset per skill-tier cohort, reusing
preprocess.py's extract_row() (a pure function, unmodified) and
validate.py's CHECKS (also pure functions) rather than duplicating the
extraction/validation logic. Master+ is not built here -- it's the
existing main dataset.parquet, used as-is.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import pandas as pd

from collect_cohort import COHORTS
from preprocess import extract_row
from train import ARTIFACTS_DIR, DATA_DIR
from validate import CHECKS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("build_cohort_datasets")

PROCESSED_DIR = DATA_DIR / "processed"
SAMPLE_COUNTS_PATH = ARTIFACTS_DIR / "day5_cohort_sample_counts.json"


def build_cohort_dataset(name: str) -> pd.DataFrame:
    raw_dir = DATA_DIR / f"raw_cohort_{name}"
    raw_files = sorted(raw_dir.glob("*.json")) if raw_dir.exists() else []
    log.info("cohort=%s raw_files_found=%d", name, len(raw_files))

    rows = []
    seen_match_ids = set()
    skip_counts: dict[str, int] = {}
    for path in raw_files:
        match = json.loads(path.read_text())
        result = extract_row(match)
        if result is None or "_skip_reason" in result:
            reason = result.get("_skip_reason", "unknown") if result else "unknown"
            skip_counts[reason] = skip_counts.get(reason, 0) + 1
            continue
        # Cohorts may span too few patches for rolling forward-patch eval
        # (sub-apex players' recent games can stretch across a much wider
        # calendar range than apex players' -- see Day 5 findings). Adding
        # gameCreation gives a fallback true-chronological split when that
        # happens, without touching preprocess.py's established schema.
        result["game_creation"] = match["info"]["gameCreation"]
        if result["match_id"] in seen_match_ids:
            skip_counts["duplicate_match_id"] = skip_counts.get("duplicate_match_id", 0) + 1
            continue
        seen_match_ids.add(result["match_id"])
        rows.append(result)

    df = pd.DataFrame(rows)
    log.info("cohort=%s valid_matches=%d skip_counts=%s", name, len(df), skip_counts)

    output_path = PROCESSED_DIR / f"cohort_{name}.parquet"
    df.to_parquet(output_path, index=False)
    log.info("cohort=%s dataset_saved path=%s", name, output_path)
    return df


def validate_cohort_dataset(name: str, df: pd.DataFrame) -> bool:
    # game_creation is a deliberate Day 5 addition (pre-game scheduling
    # timestamp, not gameplay-derived) that validate.py's schema allowlist
    # doesn't know about -- checked against every column except that one,
    # rather than silently loosening the allowlist for the main dataset too.
    df_for_leakage_check = df.drop(columns=["game_creation"], errors="ignore")

    all_passed = True
    for check_name, check_fn in CHECKS:
        target_df = df_for_leakage_check if check_name == "no post-game leakage columns" else df
        failures = check_fn(target_df)
        if failures:
            all_passed = False
            log.error("cohort=%s CHECK_FAILED name=%r failures=%s", name, check_name, failures)
        else:
            log.info("cohort=%s CHECK_PASSED name=%r", name, check_name)
    return all_passed


def build_all_cohorts() -> None:
    sample_counts = {}
    for name in COHORTS:
        df = build_cohort_dataset(name)
        if len(df) == 0:
            log.warning("cohort=%s has zero valid matches -- skipping validation", name)
            sample_counts[name] = {"valid_matches": 0, "patches": {}}
            continue
        passed = validate_cohort_dataset(name, df)
        patch_counts = df["patch"].value_counts().to_dict()
        sample_counts[name] = {"valid_matches": len(df), "patches": patch_counts, "validation_passed": passed}
        log.info("cohort=%s valid_matches=%d patches=%s validation_passed=%s", name, len(df), patch_counts, passed)

    SAMPLE_COUNTS_PATH.write_text(json.dumps(sample_counts, indent=2, default=str))
    log.info("sample_counts_saved path=%s", SAMPLE_COUNTS_PATH)


if __name__ == "__main__":
    build_all_cohorts()

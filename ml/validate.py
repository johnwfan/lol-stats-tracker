"""
Integrity checks for data/processed/dataset.parquet.

Run after preprocess.py. Exits non-zero if any check fails, so it can be
wired into CI or just run by hand before trusting the dataset.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("validate")

DATA_DIR = Path(__file__).parent / "data"
PARQUET_PATH = DATA_DIR / "processed" / "dataset.parquet"
CSV_PATH = DATA_DIR / "processed" / "dataset.csv"

CHAMPION_COLUMNS = [
    "blue_top", "blue_jungle", "blue_mid", "blue_adc", "blue_support",
    "red_top", "red_jungle", "red_mid", "red_adc", "red_support",
]
BLUE_COLUMNS = [c for c in CHAMPION_COLUMNS if c.startswith("blue_")]
RED_COLUMNS = [c for c in CHAMPION_COLUMNS if c.startswith("red_")]
ALLOWED_QUEUES = {420}

# Substrings that would indicate post-game info leaked into the dataset.
LEAKAGE_KEYWORDS = [
    "kill", "death", "assist", "gold", "damage", "item", "duration",
    "cs", "minion", "vision", "level", "perk", "summoner1", "summoner2",
    "spell", "ward",
]
ALLOWED_COLUMNS = set(CHAMPION_COLUMNS) | {"match_id", "patch", "queue_id", "blue_win"}


def load_dataset() -> pd.DataFrame:
    if PARQUET_PATH.exists():
        return pd.read_parquet(PARQUET_PATH)
    if CSV_PATH.exists():
        return pd.read_csv(CSV_PATH)
    raise FileNotFoundError(f"No processed dataset found at {PARQUET_PATH} or {CSV_PATH}. Run preprocess.py first.")


def check_no_missing_role_assignments(df: pd.DataFrame) -> list[str]:
    """Every row must have all 10 champion-role slots filled (non-null)."""
    failures = []
    missing = df[CHAMPION_COLUMNS].isnull().any(axis=1)
    if missing.any():
        failures.append(f"{missing.sum()} row(s) missing at least one of the 10 champion-role assignments")
    return failures


def check_no_duplicate_champion_within_team(df: pd.DataFrame) -> list[str]:
    """Each role appears exactly once per team by construction (one column
    per role), but a champion appearing twice on the same side would still
    indicate a corrupted row, since draft mode never allows that."""
    failures = []
    blue_dupes = df[BLUE_COLUMNS].apply(lambda row: row.duplicated().any(), axis=1)
    red_dupes = df[RED_COLUMNS].apply(lambda row: row.duplicated().any(), axis=1)
    if blue_dupes.any():
        failures.append(f"{blue_dupes.sum()} row(s) have a duplicate champion on the blue side")
    if red_dupes.any():
        failures.append(f"{red_dupes.sum()} row(s) have a duplicate champion on the red side")
    return failures


def check_ranked_queue_only(df: pd.DataFrame) -> list[str]:
    if "queue_id" not in df.columns:
        return ["queue_id column missing, cannot verify queue filter"]
    bad = ~df["queue_id"].isin(ALLOWED_QUEUES)
    if bad.any():
        return [f"{bad.sum()} row(s) have a queue_id outside {ALLOWED_QUEUES}"]
    return []


def check_no_duplicate_match_ids(df: pd.DataFrame) -> list[str]:
    dupes = df["match_id"].duplicated()
    if dupes.any():
        return [f"{dupes.sum()} duplicate match_id value(s) found"]
    return []


def check_blue_win_valid(df: pd.DataFrame) -> list[str]:
    failures = []
    if df["blue_win"].isnull().any():
        failures.append(f"{df['blue_win'].isnull().sum()} row(s) have a null blue_win")
    non_bool = ~df["blue_win"].isin([True, False])
    if non_bool.any():
        failures.append(f"{non_bool.sum()} row(s) have a non-boolean blue_win value")
    return failures


def check_no_leakage_columns(df: pd.DataFrame) -> list[str]:
    failures = []
    unexpected = set(df.columns) - ALLOWED_COLUMNS
    if unexpected:
        failures.append(f"unexpected column(s) not in the approved schema: {sorted(unexpected)}")
    for col in df.columns:
        lowered = col.lower()
        if any(keyword in lowered for keyword in LEAKAGE_KEYWORDS):
            failures.append(f"column '{col}' name matches a post-game-leakage keyword")
    return failures


CHECKS = [
    ("exactly 10 champion-role assignments per row", check_no_missing_role_assignments),
    ("no duplicate champion within a team", check_no_duplicate_champion_within_team),
    ("ranked queue only", check_ranked_queue_only),
    ("no duplicate match IDs", check_no_duplicate_match_ids),
    ("blue_win is always valid", check_blue_win_valid),
    ("no post-game leakage columns", check_no_leakage_columns),
]


def validate() -> bool:
    df = load_dataset()
    log.info("loaded_dataset rows=%d columns=%d", len(df), len(df.columns))

    all_passed = True
    for name, check in CHECKS:
        failures = check(df)
        if failures:
            all_passed = False
            log.error("CHECK_FAILED name=%r", name)
            for f in failures:
                log.error("  - %s", f)
        else:
            log.info("CHECK_PASSED name=%r", name)

    log.info("validation_complete passed=%s total_rows=%d", all_passed, len(df))
    return all_passed


if __name__ == "__main__":
    ok = validate()
    sys.exit(0 if ok else 1)

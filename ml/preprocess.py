"""
Converts raw Match-V5 JSON (data/raw/*.json) into the processed ML dataset
(data/processed/dataset.parquet).

Only draft-time information is kept: which champion played which role on
which side, the patch, and the outcome. Everything else in the raw match
(kills, gold, items, damage, duration, ...) is intentionally dropped here
so it never has a chance to leak into training data later.

Role assignment uses participant.teamPosition, Riot's own normalized
per-team position label. It's preferred over the legacy `lane`/`role`
pair and over `individualPosition` because it's the field Riot explicitly
designed to give each of the 5 canonical roles exactly once per team;
the older fields are more prone to duplicate/ambiguous labels (see
ml/README.md for the full rationale). A match is only kept if its two
teams each resolve to *exactly* {TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY}
with no duplicates or blanks -- ambiguous matches are skipped, not guessed.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("preprocess")

DATA_DIR = Path(__file__).parent / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
OUTPUT_PARQUET = PROCESSED_DIR / "dataset.parquet"
OUTPUT_CSV = PROCESSED_DIR / "dataset.csv"

ALLOWED_QUEUES = {420}  # RANKED_SOLO_5x5 only, per Day 1 scope
REMAKE_MAX_DURATION_S = 300  # heuristic: games this short are remakes, not real drafts
EXPECTED_ROLES = {"TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"}
ROLE_TO_COLUMN = {
    "TOP": "top",
    "JUNGLE": "jungle",
    "MIDDLE": "mid",
    "BOTTOM": "adc",
    "UTILITY": "support",
}


def extract_row(match: dict) -> dict | None:
    info = match.get("info", {})
    metadata = match.get("metadata", {})
    match_id = metadata.get("matchId")

    queue_id = info.get("queueId")
    if queue_id not in ALLOWED_QUEUES:
        return {"_skip_reason": "wrong_queue"}

    map_id = info.get("mapId")
    if map_id is not None and map_id != 11:
        return {"_skip_reason": "wrong_map"}

    if info.get("gameDuration", 0) < REMAKE_MAX_DURATION_S:
        return {"_skip_reason": "remake"}

    participants = info.get("participants", [])
    if len(participants) != 10:
        return {"_skip_reason": "wrong_participant_count"}

    teams: dict[int, dict[str, str]] = {100: {}, 200: {}}
    win_by_team: dict[int, bool] = {}

    for p in participants:
        team_id = p.get("teamId")
        role = p.get("teamPosition")
        champion = p.get("championName")
        win = p.get("win")

        if team_id not in (100, 200) or not role or not champion or win is None:
            return {"_skip_reason": "malformed_participant"}

        if role in teams[team_id]:
            return {"_skip_reason": "duplicate_role"}
        teams[team_id][role] = champion

        if team_id in win_by_team and win_by_team[team_id] != win:
            return {"_skip_reason": "inconsistent_win_flag"}
        win_by_team[team_id] = win

    if set(teams[100].keys()) != EXPECTED_ROLES or set(teams[200].keys()) != EXPECTED_ROLES:
        return {"_skip_reason": "ambiguous_roles"}

    if win_by_team.get(100) == win_by_team.get(200):
        return {"_skip_reason": "inconsistent_win_flag"}

    game_version = info.get("gameVersion", "")
    patch = ".".join(game_version.split(".")[:2]) if game_version else None

    row = {"match_id": match_id, "patch": patch, "queue_id": queue_id}
    for role, col in ROLE_TO_COLUMN.items():
        row[f"blue_{col}"] = teams[100][role]
        row[f"red_{col}"] = teams[200][role]
    row["blue_win"] = bool(win_by_team[100])
    return row


def preprocess() -> None:
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    raw_files = sorted(RAW_DIR.glob("*.json"))
    log.info("raw_files_found=%d", len(raw_files))

    rows: list[dict] = []
    seen_match_ids: set[str] = set()
    skip_counts: dict[str, int] = {}

    for path in raw_files:
        try:
            match = json.loads(path.read_text())
        except json.JSONDecodeError:
            skip_counts["invalid_json"] = skip_counts.get("invalid_json", 0) + 1
            continue

        result = extract_row(match)
        if result is None or "_skip_reason" in result:
            reason = result.get("_skip_reason", "unknown") if result else "unknown"
            skip_counts[reason] = skip_counts.get(reason, 0) + 1
            continue

        if result["match_id"] in seen_match_ids:
            skip_counts["duplicate_match_id"] = skip_counts.get("duplicate_match_id", 0) + 1
            continue
        seen_match_ids.add(result["match_id"])
        rows.append(result)

    log.info("valid_matches=%d", len(rows))
    for reason, count in sorted(skip_counts.items()):
        log.info("skipped reason=%s count=%d", reason, count)

    df = pd.DataFrame(rows)

    try:
        df.to_parquet(OUTPUT_PARQUET, index=False)
        log.info("dataset_saved path=%s format=parquet rows=%d", OUTPUT_PARQUET, len(df))
    except ImportError:
        df.to_csv(OUTPUT_CSV, index=False)
        log.warning("pyarrow_not_installed falling_back_to_csv path=%s rows=%d", OUTPUT_CSV, len(df))

    log.info("total_processed_records=%d", len(df))


if __name__ == "__main__":
    preprocess()

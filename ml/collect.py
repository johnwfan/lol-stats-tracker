"""
Day 1 data collector: discovers ranked solo-queue matches and saves raw
Match-V5 responses to data/raw/, one JSON file per match.

Discovery strategy (see ml/README.md for the full explanation):
  1. Seed player puuids from the Challenger/Grandmaster/Master leagues.
  2. For each seed, pull their recent ranked-solo match IDs.
  3. Fetch and save any match not already in data/raw/.

Resumable: a match already saved on disk is never re-fetched, and a seed
puuid already queried for match IDs is skipped on subsequent runs (tracked
in data/state/seeds_queried.json). Re-running this script just picks up
where it left off.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

import requests

from riot_client import RiotApiError, get_apex_league, get_match, get_match_ids_by_puuid, get_summoner_by_id

# Both a Riot-level error (bad status after retries) and a network-level
# error (connection reset after retries) should be treated the same way
# here: log it, count it, and move on to the next match/seed rather than
# crashing the whole run.
RETRYABLE_FAILURE = (RiotApiError, requests.exceptions.RequestException)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("collect")

DATA_DIR = Path(__file__).parent / "data"
RAW_DIR = DATA_DIR / "raw"
STATE_DIR = DATA_DIR / "state"
SEEDS_QUERIED_FILE = STATE_DIR / "seeds_queried.json"

PLATFORM = "na1"
QUEUE_SOLO = 420
MATCH_IDS_PER_SEED = 100  # max allowed per request by Match-V5

# Master (unlike Challenger/GM) can return 10k+ players on some regions, and
# fetching match ids for every one of them would massively overshoot a Day 1
# pilot. Cap how many seeds we draw per tier and stop once we've fetched
# enough matches overall -- both are deliberately small for a first pass and
# easy to raise later once the pipeline is trusted.
SEED_LIMIT_PER_TIER = 50
TARGET_MATCH_COUNT = 1500


def load_seeds_queried() -> set[str]:
    if SEEDS_QUERIED_FILE.exists():
        return set(json.loads(SEEDS_QUERIED_FILE.read_text()))
    return set()


def save_seeds_queried(seeds: set[str]) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    SEEDS_QUERIED_FILE.write_text(json.dumps(sorted(seeds)))


def discover_seed_puuids(platform: str) -> list[str]:
    """Pull puuids from the three apex leagues. Some league entries only
    carry summonerId (older response shape) rather than puuid directly,
    so we fall back to a Summoner-V4 lookup in that case."""
    puuids: list[str] = []
    for tier in ("challenger", "grandmaster", "master"):
        league = get_apex_league(platform, tier)
        entries = league.get("entries", [])
        log.info("seed_tier_discovered tier=%s players=%d using=%d", tier, len(entries), min(len(entries), SEED_LIMIT_PER_TIER))
        for entry in entries[:SEED_LIMIT_PER_TIER]:
            puuid = entry.get("puuid")
            if not puuid:
                summoner_id = entry.get("summonerId")
                if not summoner_id:
                    continue
                try:
                    summoner = get_summoner_by_id(platform, summoner_id)
                except RETRYABLE_FAILURE as e:
                    log.warning("summoner_lookup_failed summoner_id=%s error=%s", summoner_id, e)
                    continue
                puuid = summoner.get("puuid")
            if puuid:
                puuids.append(puuid)
    return puuids


def collect(platform: str = PLATFORM, queue: int = QUEUE_SOLO) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    STATE_DIR.mkdir(parents=True, exist_ok=True)

    seeds_queried = load_seeds_queried()
    already_saved = {p.stem for p in RAW_DIR.glob("*.json")}
    log.info("startup already_saved_matches=%d already_queried_seeds=%d", len(already_saved), len(seeds_queried))

    seed_puuids = discover_seed_puuids(platform)
    log.info("matches_discovered_from seed_players=%d", len(seed_puuids))

    stats = {
        "match_ids_discovered": 0,
        "fetched": 0,
        "duplicates_skipped": 0,
        "errors": 0,
    }

    for puuid in seed_puuids:
        if len(already_saved) >= TARGET_MATCH_COUNT:
            log.info("target_match_count_reached target=%d", TARGET_MATCH_COUNT)
            break

        if puuid in seeds_queried:
            continue

        try:
            match_ids = get_match_ids_by_puuid(platform, puuid, queue=queue, count=MATCH_IDS_PER_SEED)
        except RETRYABLE_FAILURE as e:
            log.error("match_id_lookup_failed puuid=%s error=%s", puuid, e)
            stats["errors"] += 1
            continue

        stats["match_ids_discovered"] += len(match_ids)

        for match_id in match_ids:
            if len(already_saved) >= TARGET_MATCH_COUNT:
                break

            if match_id in already_saved:
                stats["duplicates_skipped"] += 1
                continue

            try:
                match = get_match(platform, match_id)
            except RETRYABLE_FAILURE as e:
                log.error("match_fetch_failed match_id=%s error=%s", match_id, e)
                stats["errors"] += 1
                continue

            (RAW_DIR / f"{match_id}.json").write_text(json.dumps(match))
            already_saved.add(match_id)
            stats["fetched"] += 1

            if stats["fetched"] % 50 == 0:
                log.info("progress fetched=%d duplicates_skipped=%d errors=%d", stats["fetched"], stats["duplicates_skipped"], stats["errors"])

        seeds_queried.add(puuid)
        save_seeds_queried(seeds_queried)

    log.info(
        "collection_complete match_ids_discovered=%d fetched=%d duplicates_skipped=%d errors=%d total_raw_on_disk=%d",
        stats["match_ids_discovered"], stats["fetched"], stats["duplicates_skipped"], stats["errors"], len(already_saved),
    )


if __name__ == "__main__":
    try:
        collect()
    except KeyboardInterrupt:
        log.info("interrupted_by_user progress_saved=true")
        sys.exit(1)

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

Day 5: collect() and its seed-discovery helpers now accept a raw_dir/
seeds_file/target_match_count/seed source, so ml/collect_cohort.py can
reuse this exact fetch/resume/rate-limit machinery for sub-apex tier
cohorts, writing to a separate directory so cohorts never mix with the
main dataset or each other. Calling collect() with no arguments (the
`python collect.py` entry point) behaves exactly as before.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path

import requests

from riot_client import RiotApiError, get_apex_league, get_division_league, get_match, get_match_ids_by_puuid, get_summoner_by_id

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

# Day 1 kept these deliberately small for a first pilot. Day 3 raises both:
# SEED_LIMIT_PER_TIER is now effectively uncapped (no apex tier exceeds ~10k
# players) since the real constraint at scale is rate-limited runtime, not
# seed exhaustion -- see ml/README.md for the reasoning. Resumable, so this
# can be raised further later toward a 20-50k longer-term target.
SEED_LIMIT_PER_TIER = 5000
TARGET_MATCH_COUNT = 15000


def load_seeds_queried(seeds_file: Path) -> set[str]:
    if seeds_file.exists():
        return set(json.loads(seeds_file.read_text()))
    return set()


def save_seeds_queried(seeds: set[str], seeds_file: Path) -> None:
    seeds_file.parent.mkdir(parents=True, exist_ok=True)
    seeds_file.write_text(json.dumps(sorted(seeds)))


def discover_apex_seed_puuids(platform: str) -> list[str]:
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


def discover_division_seed_puuids(platform: str, tier: str, division: str, max_seeds: int = 5000) -> list[str]:
    """Sub-apex tier (Day 5 cohorts): division entries already include
    puuid directly, no Summoner-V4 fallback needed. Paginates until either
    max_seeds is reached or Riot returns an empty page (end of division)."""
    puuids: list[str] = []
    page = 1
    while len(puuids) < max_seeds:
        entries = get_division_league(platform, tier, division, page=page)
        if not entries:
            log.info("division_exhausted tier=%s division=%s last_page=%d total_seeds=%d", tier, division, page, len(puuids))
            break
        puuids.extend(e["puuid"] for e in entries if e.get("puuid"))
        log.info("division_page_fetched tier=%s division=%s page=%d entries=%d total_seeds=%d", tier, division, page, len(entries), len(puuids))
        page += 1
    return puuids[:max_seeds]


def collect(
    platform: str = PLATFORM,
    queue: int = QUEUE_SOLO,
    raw_dir: Path = RAW_DIR,
    seeds_file: Path = SEEDS_QUERIED_FILE,
    target_match_count: int = TARGET_MATCH_COUNT,
    seed_source: str = "apex",
    division_tier: str | None = None,
    division: str | None = None,
) -> None:
    raw_dir.mkdir(parents=True, exist_ok=True)
    seeds_file.parent.mkdir(parents=True, exist_ok=True)

    seeds_queried = load_seeds_queried(seeds_file)
    already_saved = {p.stem for p in raw_dir.glob("*.json")}
    log.info("startup raw_dir=%s already_saved_matches=%d already_queried_seeds=%d", raw_dir, len(already_saved), len(seeds_queried))

    if seed_source == "apex":
        seed_puuids = discover_apex_seed_puuids(platform)
    elif seed_source == "division":
        assert division_tier and division, "division_tier and division are required when seed_source='division'"
        seed_puuids = discover_division_seed_puuids(platform, division_tier, division)
    else:
        raise ValueError(f"Unknown seed_source: {seed_source}")
    log.info("matches_discovered_from seed_players=%d", len(seed_puuids))

    stats = {
        "match_ids_discovered": 0,
        "fetched": 0,
        "duplicates_skipped": 0,
        "errors": 0,
    }

    for puuid in seed_puuids:
        if len(already_saved) >= target_match_count:
            log.info("target_match_count_reached target=%d", target_match_count)
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
            if len(already_saved) >= target_match_count:
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

            (raw_dir / f"{match_id}.json").write_text(json.dumps(match))
            already_saved.add(match_id)
            stats["fetched"] += 1

            if stats["fetched"] % 50 == 0:
                log.info("progress fetched=%d duplicates_skipped=%d errors=%d", stats["fetched"], stats["duplicates_skipped"], stats["errors"])

        seeds_queried.add(puuid)
        save_seeds_queried(seeds_queried, seeds_file)

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

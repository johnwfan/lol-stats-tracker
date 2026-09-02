"""
Thin Riot API client for the ML data pipeline.

This intentionally mirrors (rather than imports, since it's a separate
Python runtime) the conventions already used by the Next.js app:
  - src/lib/riot/riotFetch.ts  -> retry/backoff behavior
  - src/lib/riot/regions.ts    -> platform -> regional routing table
  - RIOT_API_KEY env var name

Two routing hosts are used by Riot's API:
  - "platform" host (e.g. na1.api.riotgames.com)   -> Summoner-V4, League-V4
  - "regional" host (e.g. americas.api.riotgames.com) -> Match-V5, Account-V1
"""

from __future__ import annotations

import logging
import os
import time
from collections import deque

import requests
from dotenv import load_dotenv

load_dotenv()

log = logging.getLogger("riot_client")

# Same table as src/lib/riot/regions.ts
PLATFORM_TO_REGIONAL = {
    "br1": "americas",
    "la1": "americas",
    "la2": "americas",
    "na1": "americas",
    "eun1": "europe",
    "euw1": "europe",
    "tr1": "europe",
    "ru": "europe",
    "kr": "asia",
    "jp1": "asia",
    "oc1": "sea",
    "sg2": "sea",
    "tw2": "sea",
    "vn2": "sea",
    "th2": "sea",
    "ph2": "sea",
}


def regional_from_platform(platform: str) -> str:
    try:
        return PLATFORM_TO_REGIONAL[platform]
    except KeyError:
        raise ValueError(f"Unknown platform: {platform}")


class RateLimiter:
    """Proactively paces requests to stay under a typical Riot dev-key
    limit (20 req/1s, 100 req/2min), so we hit 429s rarely instead of
    relying on retry-after alone to recover from them."""

    def __init__(self, per_second: int = 20, per_two_min: int = 100):
        self.per_second = per_second
        self.per_two_min = per_two_min
        self._short: deque[float] = deque()
        self._long: deque[float] = deque()

    def wait(self) -> None:
        while True:
            now = time.monotonic()
            while self._short and now - self._short[0] > 1:
                self._short.popleft()
            while self._long and now - self._long[0] > 120:
                self._long.popleft()

            if len(self._short) < self.per_second and len(self._long) < self.per_two_min:
                self._short.append(now)
                self._long.append(now)
                return

            wait_short = 1 - (now - self._short[0]) if self._short else 0
            wait_long = 120 - (now - self._long[0]) if self._long else 0
            time.sleep(max(wait_short, wait_long, 0.05))


_rate_limiter = RateLimiter()


class RiotApiError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(f"Riot error {status}: {message}")
        self.status = status


def riot_get(url: str, params: dict | None = None, max_attempts: int = 3) -> dict:
    """GET a Riot API URL with the same retry semantics as riotFetch.ts:
    up to `max_attempts` tries, retrying on 429/5xx using the Retry-After
    header when present, else a linear backoff. Raises RiotApiError on any
    other non-2xx status or after exhausting retries.
    """
    api_key = os.environ.get("RIOT_API_KEY")
    if not api_key:
        raise RuntimeError("Missing RIOT_API_KEY (set it in ml/.env)")

    last_err: Exception | None = None
    for attempt in range(max_attempts):
        _rate_limiter.wait()
        try:
            resp = requests.get(url, params=params, headers={"X-Riot-Token": api_key}, timeout=10)
        except requests.exceptions.RequestException as e:
            wait_s = 0.25 * (attempt + 1)
            log.warning(
                "network_error_retry attempt=%d wait_s=%.2f url=%s error=%s",
                attempt + 1, wait_s, url, e,
            )
            last_err = e
            time.sleep(wait_s)
            continue

        if resp.ok:
            return resp.json()

        if resp.status_code == 429 or 500 <= resp.status_code <= 599:
            retry_after = resp.headers.get("retry-after")
            wait_s = float(retry_after) if retry_after else 0.25 * (attempt + 1)
            log.warning(
                "rate_limit_retry status=%s attempt=%d wait_s=%.2f url=%s",
                resp.status_code, attempt + 1, wait_s, url,
            )
            last_err = RiotApiError(resp.status_code, resp.text)
            time.sleep(wait_s)
            continue

        raise RiotApiError(resp.status_code, resp.text)

    assert last_err is not None
    raise last_err


# --- League-V4 (platform routing) ---------------------------------------

def get_apex_league(platform: str, tier: str) -> dict:
    """tier: 'challenger' | 'grandmaster' | 'master'"""
    url = f"https://{platform}.api.riotgames.com/lol/league/v4/{tier}leagues/by-queue/RANKED_SOLO_5x5"
    return riot_get(url)


def get_summoner_by_id(platform: str, summoner_id: str) -> dict:
    url = f"https://{platform}.api.riotgames.com/lol/summoner/v4/summoners/{summoner_id}"
    return riot_get(url)


def get_division_league(platform: str, tier: str, division: str, page: int = 1) -> list[dict]:
    """Sub-apex tier (e.g. tier='GOLD', division='II'). Unlike the apex
    league entries, these already include puuid directly -- no Summoner-V4
    fallback needed. Paginated (~205 entries/page observed); returns []
    once past the last page."""
    url = f"https://{platform}.api.riotgames.com/lol/league/v4/entries/RANKED_SOLO_5x5/{tier}/{division}"
    return riot_get(url, params={"page": page})


# --- Match-V5 (regional routing) ----------------------------------------

def get_match_ids_by_puuid(platform: str, puuid: str, queue: int = 420, count: int = 100, start: int = 0) -> list[str]:
    regional = regional_from_platform(platform)
    url = f"https://{regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
    params = {"queue": queue, "type": "ranked", "start": start, "count": count}
    return riot_get(url, params=params)


def get_match(platform: str, match_id: str) -> dict:
    regional = regional_from_platform(platform)
    url = f"https://{regional}.api.riotgames.com/lol/match/v5/matches/{match_id}"
    return riot_get(url)

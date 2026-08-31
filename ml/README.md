# Draft Intelligence — Data Pipeline (Day 1)

Collects ranked Solo/Duo matches from the Riot API and turns them into a
draft-only training dataset (champion picks by role + win outcome, nothing
from after champion select). This is data collection and dataset
preparation only — no model training yet.

## Pipeline

```
collect.py  -> data/raw/{matchId}.json       (raw Match-V5 responses)
preprocess.py -> data/processed/dataset.parquet  (one row per match)
validate.py  -> checks the processed dataset for integrity/leakage
```

## Role assignment

Roles are read from `participant.teamPosition`, Riot's normalized per-team
position label. It's preferred over `individualPosition` (Riot's raw,
less consistent per-player inference) and over the legacy `lane`/`role`
pair (pre-`teamPosition` heuristic, notably unreliable for bot lane
carry-vs-support and lane swaps). A match is only kept if both teams
resolve to exactly `{TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY}` with no
duplicates or blanks — anything ambiguous is skipped, not guessed.

## Processed dataset schema

| column | meaning |
|---|---|
| `match_id` | Riot match ID |
| `patch` | major.minor patch, e.g. `"14.10"` |
| `queue_id` | 420 (ranked solo) — kept so `validate.py` can verify the queue filter independently |
| `blue_top` ... `blue_support` | champion name per role, blue side |
| `red_top` ... `red_support` | champion name per role, red side |
| `blue_win` | boolean outcome |

No post-game stats (kills/deaths/assists/gold/damage/items/duration/etc.)
are included — see `preprocess.py` for the extraction logic.

## Setup

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configure the Riot API key

```bash
cp .env.example .env
# then edit ml/.env and paste your key, e.g.:
# RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

This is a separate `.env` from the one used by the Next.js app (which
also has `RIOT_API_KEY` for the same purpose) — keep them in sync manually
if you use the same key for both.

## Run the collector

```bash
python collect.py
```

Logs show matches discovered, fetched, duplicates skipped, and API errors
as it runs.

## Stop and resume

Press `Ctrl+C` any time — already-saved matches and already-queried seed
players are tracked on disk, so re-running `python collect.py` continues
rather than starting over:

```bash
python collect.py
```

## Inspect raw data

```bash
ls data/raw | wc -l
python -c "import json; print(json.dumps(json.load(open('data/raw/' + __import__('os').listdir('data/raw')[0])), indent=2)[:2000])"
```

## Build the processed dataset

```bash
python preprocess.py
```

## Run validation checks

```bash
python validate.py
```

Exits non-zero if any check fails. Prints a pass/fail line per check plus
the row-level failure count for anything that fails.

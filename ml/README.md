# Draft Intelligence — Data Pipeline

Collects ranked Solo/Duo matches from the Riot API, turns them into a
draft-only training dataset (champion picks by role + win outcome, nothing
from after champion select), and trains/evaluates a baseline win-probability
model from that dataset.

## Pipeline

```
collect.py    -> data/raw/{matchId}.json           (raw Match-V5 responses)
preprocess.py -> data/processed/dataset.parquet     (one row per match)
validate.py   -> checks the processed dataset for integrity/leakage
train.py      -> artifacts/baseline_model.joblib, test_predictions.parquet, training_config.json
evaluate.py   -> artifacts/metrics.json, calibration_plot.png
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

## Train the baseline models

```bash
python train.py
```

Fits two models on the processed dataset, using only the 10 champion-role
columns as features (one-hot encoded via a scikit-learn `ColumnTransformer`):
a trivial `DummyClassifier(strategy="prior")` baseline (always predicts the
training set's historical blue-win rate), and a `LogisticRegression` model.

The split is **chronological by patch**, not random: the newest patch in the
dataset becomes the test set, everything older is training data. This
measures whether the model generalizes to a patch it has never seen —
the realistic scenario for a draft tool — rather than just interpolating
within patches it was already trained on.

Writes to `artifacts/`: `baseline_model.joblib` (the fitted logistic
regression pipeline — preprocessing + model together, so it's ready to
call `.predict_proba()` on new draft data), `test_predictions.parquet`
(both models' predictions on the held-out patch), and
`training_config.json` (seed, split, hyperparameters — for reproducibility).

## Evaluate

```bash
python evaluate.py
```

Computes accuracy, ROC-AUC, log loss, Brier score, and a confusion matrix
for both models on the same held-out test set, and reports the delta
between them. Also produces a calibration plot (`artifacts/calibration_plot.png`)
checking whether predicted probabilities match observed win rates — with
a logged caveat that the ~212-row single-patch test set makes this a rough
qualitative read, not a precise measurement.

Logistic regression coefficients are inspected and written to
`artifacts/metrics.json` as the strongest positive/negative champion-role
associations found in the training data — framed as associations the model
found, not causal claims, since a linear model over one-hot features can't
represent champion synergies or counters.

All of `artifacts/` is gitignored (regenerable by rerunning `train.py` then
`evaluate.py`), same convention as `data/raw|processed|state/`.

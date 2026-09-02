# Draft Intelligence — Inference Service

A small FastAPI service that analyzes a 10-champion League of Legends draft and returns a **relative historical draft-strength assessment**.

## What this model does

Given a complete draft (5 blue-side picks by role, 5 red-side picks by role), it compares that draft's model score against the score distribution of thousands of real historical ranked matches, and reports where it falls — as a percentile and a qualitative label (e.g. "Slight Blue Edge") — plus a confidence indicator and any relevant warnings.

## What this model does NOT do

**It does not predict the probability that a specific game will be won.** It never returns a field like `win_probability`, and no part of this service should be presented to users as "Blue has a 63% chance to win."

This is a deliberate product decision, not a missing feature. Five days of research (summarized below) found that champion-draft identity alone carries a real but weak and unstable predictive signal — not stable or strong enough to defensibly present as a precise probability. The relative draft-strength framing is what the evidence actually supports.

## Training data

The frozen model (`draft-logreg-v1`) is a logistic regression fit on **14,826 ranked Solo/Duo matches** (`queue=420`), NA1 platform, Challenger/Grandmaster/Master players, spanning patches 16.10–16.17. Features are the 10 champion-role picks only (one-hot encoded, rare champion-role combinations below ~0.47% of training rows grouped into an "infrequent" bucket). No post-game information, rank, or player-identity features are used — see `ml/README.md` for the full data pipeline.

## Evaluation

Model selection did not use a single train/test split or the single highest score on one fold. It used **rolling forward-patch evaluation**: train on all patches before N, test on N, repeated across every available patch boundary, then averaged — which measures generalization to a genuinely future patch rather than interpolation within known ones. Across that evaluation, this logistic regression configuration and a CatBoost (gradient-boosted trees) alternative landed in a statistically indistinguishable range on log loss, Brier score, and accuracy; CatBoost's apparent ROC-AUC edge was traced to a single favorable fold (it lost on 3 of 5) and showed measurable overfitting. Logistic regression was selected as the simpler, equally effective, more interpretable option — see `ml/artifacts/day4_metrics.json` and `model_registry/draft-logreg-v1.json` for the full numbers.

## Why relative strength instead of a win probability

Beyond the model-comparison result above, four other independent attempts to strengthen the signal (more training data, regularization/rare-category tuning, an additional legitimate pre-game feature family — bans, and testing whether skill-tier population matters) each came back the same way: no reliable, stable improvement. That consistent pattern across five days of varied experiments — not a single disappointing run — is why the product only claims a relative, historical comparison. Full research history: `ml/README.md` and `ml/artifacts/`.

## How the draft-strength score is calculated

1. The model produces a raw score in `[0, 1]` from the draft (`raw_score`).
2. That score is converted to a `z_score` against the reference distribution (mean/std of the model's own scores on its full training set — see `reference_distribution.json`).
3. `advantage` is assigned from `z_score` using boundaries chosen from the *actual shape* of that reference distribution (verified close to normal — skewness ≈ 0.005): `|z| < 0.5` → even (~38% of historical drafts), `0.5 ≤ |z| < 1.5` → slight edge (~24% per side), `|z| ≥ 1.5` → strong edge (~7% per side, roughly 1-in-15 historical drafts) — not arbitrary round-number percentiles. Verified directly against the saved production reference data in `verify_reference_distribution.py`: empirical 37.69% / 48.85% (both sides) / 13.46% (both sides), matching standard-normal theoretical expectations (38.29% / 48.35% / 13.36%) closely.
4. `confidence` is `"low"` by default (reflecting the model's own validated overall performance across every research day) and `"very_low"` when any pick in the request fell into the training-time "infrequent category" bucket for its role — a real, checkable fact, not an invented per-request precision estimate.

## Running locally

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Requires the Next.js app's `.env`/`.env.local` to set `ML_API_URL=http://localhost:8001`.

## Regenerating the frozen model

```bash
cd ml
source .venv/bin/activate
python freeze_final_model.py
```

This reuses `ml/train.py`'s pipeline-building code and the frozen config (`C=0.01`, `min_frequency=50`) — it does not retune anything. It refits on the full research dataset and republishes `model_registry/draft-logreg-v1.joblib` + `.json`, `reference_distribution.json`, and `champion_vocabulary.json`. Never edits anything under `ml/artifacts/`.

## Tests

```bash
cd ml-service
source .venv/bin/activate
python test_e2e.py
```

Covers one valid draft and four invalid-input cases (missing role, duplicate champion, unknown champion, malformed JSON).

## API

### `POST /analyze-draft`

Request body: all 10 of `blue_top`, `blue_jungle`, `blue_mid`, `blue_adc`, `blue_support`, `red_top`, `red_jungle`, `red_mid`, `red_adc`, `red_support` (champion name strings).

Response: see `schemas.py`'s `DraftAnalysis` — `raw_score`, `z_score`, `percentile`, `advantage`, `confidence`, `warnings`, `model_version`, `reference_population`, `disclaimer`.

Errors: `422` for missing/malformed fields (pydantic schema validation), `400` for a duplicate or unrecognized champion name, `500` for anything unexpected (no internal details leaked).

### `GET /health`

Returns `{"status": "ok", "model_version": "..."}`.

## Model versioning

The current version is `draft-logreg-v1`, recorded in `model_registry/draft-logreg-v1.json` alongside its exact training configuration, dataset size/patches, feature list, training date, and evaluation summary. Every API response includes `model_version`, so a future model upgrade (`draft-logreg-v2`, or a different architecture entirely) can be introduced without silently changing what a deployed client is relying on.

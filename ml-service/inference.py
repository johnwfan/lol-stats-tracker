"""
Loads the frozen model once and turns a validated draft into a
DraftAnalysis. See ml/freeze_final_model.py for how the artifacts here
were produced.
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import pandas as pd

from schemas import ROLE_FIELDS, DraftAnalysis, DraftRequest

MODEL_REGISTRY_DIR = Path(__file__).parent / "model_registry"
MODEL_VERSION = "draft-logreg-v1"

# Boundaries chosen from the reference distribution's actual shape (see
# ml/freeze_final_model.py's docstring / ml-service/README.md): it's close
# enough to normal that these z-score cutoffs correspond to roughly the
# middle ~38% / next ~24% each side / outer ~7% each side of real historical
# drafts (verified empirically in verify_reference_distribution.py), rather
# than being arbitrary round percentiles.
SLIGHT_EDGE_Z = 0.5
STRONG_EDGE_Z = 1.5


class InvalidDraftError(ValueError):
    """Raised for business-logic validation failures (duplicate/unknown
    champion) -- distinct from pydantic's own schema-level validation
    (missing/mistyped fields), which FastAPI handles natively."""


class DraftAnalyzer:
    def __init__(self, registry_dir: Path = MODEL_REGISTRY_DIR):
        self.pipeline = joblib.load(registry_dir / f"{MODEL_VERSION}.joblib")
        self.metadata = json.loads((registry_dir / f"{MODEL_VERSION}.json").read_text())
        self.reference = json.loads((registry_dir.parent / "reference_distribution.json").read_text())
        self.champion_vocabulary = set(json.loads((registry_dir.parent / "champion_vocabulary.json").read_text()))

        self.reference_mean = self.reference["mean"]
        self.reference_std = self.reference["std"]
        self.reference_percentiles = {int(k): v for k, v in self.reference["percentiles"].items()}

        # column -> set of categories the fitted OneHotEncoder treats as
        # "infrequent" (collapsed at min_frequency=50 during training) --
        # used to flag low-support picks, never to block them.
        onehot = self.pipeline.named_steps["preprocessing"].named_transformers_["onehot"]
        infrequent = getattr(onehot, "infrequent_categories_", None) or []
        self._infrequent_by_column = dict(zip(ROLE_FIELDS, infrequent))

    def validate(self, draft: DraftRequest) -> None:
        picks = [getattr(draft, field) for field in ROLE_FIELDS]

        seen = set()
        for field, champ in zip(ROLE_FIELDS, picks):
            if champ in seen:
                raise InvalidDraftError(f"duplicate champion: '{champ}' appears more than once in the draft")
            seen.add(champ)

        unknown = [champ for champ in picks if champ not in self.champion_vocabulary]
        if unknown:
            raise InvalidDraftError(f"unknown champion name(s): {sorted(set(unknown))}")

    def _low_support_warnings(self, draft: DraftRequest) -> list[str]:
        warnings = []
        for field in ROLE_FIELDS:
            champ = getattr(draft, field)
            infrequent_here = self._infrequent_by_column.get(field)
            if infrequent_here is not None and champ in infrequent_here:
                warnings.append(f"{field} pick ('{champ}') has limited historical support in training data")
        return warnings

    def analyze(self, draft: DraftRequest) -> DraftAnalysis:
        self.validate(draft)

        row = pd.DataFrame([{field: getattr(draft, field) for field in ROLE_FIELDS}])
        raw_score = float(self.pipeline.predict_proba(row[ROLE_FIELDS])[:, 1][0])

        z = (raw_score - self.reference_mean) / self.reference_std
        percentile = self._empirical_percentile(raw_score)

        if abs(z) >= STRONG_EDGE_Z:
            advantage = "strong_blue" if z > 0 else "strong_red"
        elif abs(z) >= SLIGHT_EDGE_Z:
            advantage = "slight_blue" if z > 0 else "slight_red"
        else:
            advantage = "even"

        warnings = self._low_support_warnings(draft)
        confidence = "very_low" if warnings else "low"

        return DraftAnalysis(
            raw_score=raw_score,
            z_score=z,
            percentile=percentile,
            advantage=advantage,
            confidence=confidence,
            warnings=warnings,
            model_version=MODEL_VERSION,
            reference_population=self.metadata["dataset"]["reference_population"],
        )

    def _empirical_percentile(self, raw_score: float) -> float:
        points = sorted(self.reference_percentiles.items())
        if raw_score <= points[0][1]:
            return float(points[0][0])
        if raw_score >= points[-1][1]:
            return float(points[-1][0])
        for (p_lo, v_lo), (p_hi, v_hi) in zip(points, points[1:]):
            if v_lo <= raw_score <= v_hi:
                if v_hi == v_lo:
                    return float(p_lo)
                frac = (raw_score - v_lo) / (v_hi - v_lo)
                return p_lo + frac * (p_hi - p_lo)
        return 50.0


# Loaded once at import time -- kept in memory across requests, not
# reloaded per-request. Simplest correct pattern for a single-process MVP.
analyzer = DraftAnalyzer()

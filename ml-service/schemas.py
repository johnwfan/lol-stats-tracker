"""
Request/response schemas for the draft analysis API.

DraftAnalysis intentionally never contains a field like "win_probability" --
Days 1-5 of research did not find strong enough, stable enough evidence to
support that product claim. raw_score is an internal model output; the
product-facing fields are the relative ones (percentile/advantage).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

ROLE_FIELDS = [
    "blue_top", "blue_jungle", "blue_mid", "blue_adc", "blue_support",
    "red_top", "red_jungle", "red_mid", "red_adc", "red_support",
]


class DraftRequest(BaseModel):
    blue_top: str
    blue_jungle: str
    blue_mid: str
    blue_adc: str
    blue_support: str
    red_top: str
    red_jungle: str
    red_mid: str
    red_adc: str
    red_support: str


class DraftAnalysis(BaseModel):
    raw_score: float = Field(description="Internal model output, 0-1. NOT a win probability -- do not present it as one.")
    z_score: float = Field(description="Standardized distance of raw_score from the historical reference distribution's mean.")
    percentile: float = Field(description="0-100 empirical percentile of raw_score within the reference distribution (blue-side).")
    advantage: Literal["strong_red", "slight_red", "even", "slight_blue", "strong_blue"]
    confidence: Literal["low", "very_low"]
    warnings: list[str] = Field(default_factory=list)
    model_version: str
    reference_population: str
    disclaimer: str = (
        "This is a historical draft-strength comparison based on past ranked matches, "
        "not a prediction of this specific game's outcome or an exact win probability."
    )

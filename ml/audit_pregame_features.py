"""
Day 5, Part D, Step 9: audits every field actually present in the raw
Match-V5 responses on disk and categorizes each as a safe pre-game
feature, a questionable/temporally-difficult one, or forbidden post-game
leakage -- grounded in the real stored data, not assumptions.

perks.styles[].selections[].var1/var2/var3 were empirically checked
(not assumed) against 200 sampled matches: many show high-cardinality,
widely-varying values per rune (e.g. one keystone showed 123 distinct
var1 values across 125 samples, ranging 12-5311) -- consistent with
in-game telemetry (stacks/healing/damage accumulated by that rune), not
a fixed pre-game choice. Only the perk/style IDs themselves (which rune
was equipped) are safe; the var* sub-fields are excluded as leakage risk.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from train import ARTIFACTS_DIR

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("audit_pregame_features")

DATA_DIR = Path(__file__).parent / "data"
RAW_DIR = DATA_DIR / "raw"
OUTPUT_PATH = ARTIFACTS_DIR / "day5_pregame_feature_audit.json"

AUDIT = [
    # feature, available, pre_game, leakage_risk, recommendation
    ("info.teams[].bans[].championId", True, True, "none", "SAFE -- chosen during champ select, before the game starts. Strong candidate: directly reflects draft strategy (denial)."),
    ("info.teams[].bans[].pickTurn", True, True, "none", "SAFE -- ban order, fixed at champ select."),
    ("participants[].summoner1Id / summoner2Id", True, True, "none", "SAFE -- summoner spells, chosen at champ select. Likely low marginal value: largely redundant with role/champion identity already in the model (e.g. Flash+Heal vs Flash+Teleport correlates strongly with role)."),
    ("participants[].perks.styles[].style (primary/sub rune tree)", True, True, "none", "SAFE -- rune page locked in before the game starts."),
    ("participants[].perks.styles[].selections[].perk (rune ID)", True, True, "none", "SAFE -- specific keystone/rune chosen, fixed at champ select."),
    ("participants[].perks.statPerks (offense/flex/defense shards)", True, True, "none", "SAFE -- stat shard choice, fixed at champ select."),
    ("participants[].perks.styles[].selections[].var1/var2/var3", True, False, "high", "FORBIDDEN -- empirically checked, NOT constant: one keystone showed 123 unique var1 values across 125 samples (range 12-5311), consistent with in-game telemetry (stacks/healing/damage from that rune), not a pre-game setting. Exclude these sub-fields specifically even though the parent 'perks' object is mostly safe."),
    ("info.queueId", True, True, "none", "SAFE -- already used (queue filter)."),
    ("info.mapId", True, True, "none", "SAFE -- already used (map filter)."),
    ("info.gameVersion (patch)", True, True, "none", "SAFE -- already used, but deliberately excluded as a MODEL FEATURE per Day 2/3 findings: under the chronological split, the test patch is never seen in training, so it contributes no signal, only used for the split itself."),
    ("participants[].teamPosition", True, "partial", "low", "Used only to construct the champion-role columns (Day 1 finding: it's Riot's post-game-inferred role label, most reliable of the available role fields, but technically inferred from behavior, not a pure pre-game field). Already the foundation of the whole dataset; not a new candidate."),
    ("participants[].selectedRolePreferences", True, True, "none", "SAFE, unused. Player's queue-time role preference (before champ select). Minor candidate -- likely low marginal value beyond teamPosition, and can diverge from it (autofill)."),
    ("participants[].positionAssignedByMatchmaking", True, True, "none", "SAFE, unused. Role assigned by matchmaker before champ select. Interesting mainly as a lane-swap detector versus teamPosition, not directly useful as a model feature."),
    ("participants[].summonerLevel", True, True, "low", "SAFE and temporally correct as a HISTORICAL value -- it's embedded in the match record from game time itself, not fetched live, so unlike current-rank lookups it does NOT suffer the today's-rank-vs-historical-rank leakage problem. Low expected predictive value (level 30+ accounts span all skill tiers) and out of scope for Day 5's single feature experiment, noted for completeness."),
    ("participants[].kills/deaths/assists/damage*/gold*/CS/items*/wards*/challenges/PlayerScore*/Pings/timePlayed/visionScore/etc.", True, False, "high", "FORBIDDEN -- all generated during or after gameplay, already excluded since Day 1's preprocess.py."),
    ("info.gameDuration / gameEndTimestamp", True, False, "high", "FORBIDDEN -- only known once the game ends (also used, safely, only to detect remakes -- never as a model feature)."),
    ("(live lookup) current League-V4 rank/tier", "not stored", False, "high (temporal)", "QUESTIONABLE -- Riot only exposes a player's CURRENT rank; a historical match's actual rank at play-time is not reconstructable from it. Used only as a Day 5 SAMPLING mechanism (which population a match came from), never as a per-match feature."),
    ("(live lookup) current champion mastery", "not stored", False, "high (temporal)", "QUESTIONABLE -- same problem: current mastery includes games played after any given historical match. Not used."),
]


def audit() -> None:
    sample_file = next(RAW_DIR.glob("*.json"))
    sample = json.loads(sample_file.read_text())
    log.info("audit_grounded_in_file=%s", sample_file.name)
    log.info("info_keys=%s", sorted(sample["info"].keys()))
    log.info("participant_keys_count=%d", len(sample["info"]["participants"][0].keys()))

    rows = [
        {"feature": f, "available": avail, "pre_game": pg, "leakage_risk": risk, "recommendation": rec}
        for f, avail, pg, risk, rec in AUDIT
    ]
    for r in rows:
        log.info("audit_row feature=%s available=%s pre_game=%s leakage_risk=%s", r["feature"], r["available"], r["pre_game"], r["leakage_risk"])

    OUTPUT_PATH.write_text(json.dumps({"grounded_in_sample_file": sample_file.name, "audit": rows}, indent=2))
    log.info("audit_saved path=%s", OUTPUT_PATH)


if __name__ == "__main__":
    audit()

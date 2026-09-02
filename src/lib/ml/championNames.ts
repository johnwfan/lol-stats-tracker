import { getChampionMap, getLatestDdragonVersion } from "@/lib/ddragon";
import type { ChampionMapEntry } from "@/types/domain";

export interface PickableChampion extends ChampionMapEntry {
  /** The exact string to send to /api/ml/analyze-draft -- see toApiChampionName. */
  apiName: string;
}

/**
 * Data Dragon's champion key -> the string the ML model actually expects
 * (Riot's raw Match-V5 championName). Verified empirically by diffing the
 * model's champion_vocabulary.json (173 names) against a live Data Dragon
 * champion.json (also 173): the ONLY discrepancy across the entire roster
 * is this one casing difference. Not a guess, not a broad mapping table --
 * exactly the single correction the data required.
 */
const DDRAGON_ID_TO_API_NAME: Record<string, string> = {
  Fiddlesticks: "FiddleSticks",
};

export function toApiChampionName(ddragonId: string): string {
  return DDRAGON_ID_TO_API_NAME[ddragonId] || ddragonId;
}

let cachedPickableChampions: PickableChampion[] | null = null;

/** Full current champion roster, sorted by display name, ready for the picker. */
export async function loadPickableChampions(): Promise<PickableChampion[]> {
  if (cachedPickableChampions) return cachedPickableChampions;

  const version = await getLatestDdragonVersion();
  const championMap = await getChampionMap(version);

  const champions = Object.values(championMap)
    .map((entry) => ({ ...entry, apiName: toApiChampionName(entry.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  cachedPickableChampions = champions;
  return champions;
}

import type { ChampionMap } from "@/types/domain";

// Small set of known mismatches between Riot names and DDragon filenames
export const CHAMPION_DDRAGON_EXCEPTIONS: Record<string, string> = {
  FiddleSticks: "Fiddlesticks",
  Wukong: "MonkeyKing",
  KhaZix: "Khazix",
  ChoGath: "Chogath",
  LeBlanc: "Leblanc",
};

export function championToDdragonImageName(championName: string): string {
  return CHAMPION_DDRAGON_EXCEPTIONS[championName] || championName;
}

export function championIconUrl(championName: string): string | null {
  const champ = championToDdragonImageName(championName);
  if (!champ) return null;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/${champ}_0.jpg`;
}

let cachedVersion: string | null = null;
export async function getLatestDdragonVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const res = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions: string[] = await res.json();
    cachedVersion = versions?.[0] || "14.1.1";
  } catch {
    cachedVersion = "14.1.1";
  }
  return cachedVersion;
}

export function profileIconUrl(profileIconId: number | null | undefined, version: string | null): string | null {
  if (profileIconId == null || !version) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`;
}

export function itemIconUrl(itemId: number | null | undefined, version: string | null): string | null {
  if (!itemId || !version) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
}

const SUMMONER_SPELL_ICON: Record<number, string> = {
  1: "SummonerBoost", // Cleanse
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste", // Ghost
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  13: "SummonerMana", // Clarity
  14: "SummonerDot", // Ignite
  21: "SummonerBarrier",
  32: "SummonerSnowball", // Mark (ARAM)
};

export function summonerSpellIconUrl(spellId: number | null | undefined, version: string | null): string | null {
  const key = spellId != null ? SUMMONER_SPELL_ICON[spellId] : undefined;
  if (!key || !version) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${key}.png`;
}

const RUNE_STYLE_ICON: Record<number, string> = {
  8000: "7201_Precision.png",
  8100: "7200_Domination.png",
  8200: "7202_Sorcery.png",
  8300: "7203_Whimsy.png", // Inspiration
  8400: "7204_Resolve.png",
};

export function runeStyleIconUrl(styleId: number | null | undefined): string | null {
  const file = styleId != null ? RUNE_STYLE_ICON[styleId] : undefined;
  if (!file) return null;
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${file}`;
}

let cachedChampionMap: ChampionMap | null = null;
export async function getChampionMap(version: string): Promise<ChampionMap> {
  if (cachedChampionMap) return cachedChampionMap;
  const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
  const data = await res.json();
  const map: ChampionMap = {};
  for (const champ of Object.values(data.data) as { key: string; id: string; name: string }[]) {
    map[Number(champ.key)] = { id: champ.id, name: champ.name };
  }
  cachedChampionMap = map;
  return map;
}

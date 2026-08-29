export interface RegionOption {
  label: string;
  value: string;
}

export interface ChampionMapEntry {
  id: string;
  name: string;
}

export type ChampionMap = Record<number, ChampionMapEntry>;

export interface ProfileData {
  platform: string;
  regional?: string;
  puuid: string;
  summonerId: string;
  name: string;
  tag: string;
  profileIconId: number;
  summonerLevel: number;
  lastFetchedAt?: string;
}

export interface RankedData {
  platform: string;
  puuid: string;
  rankedStatus: "RANKED" | "UNRANKED";
  entries: import("@/lib/riot/types").LeagueEntryDto[];
}

export interface RecentSearchItem {
  _id: string;
  platform: string;
  name: string;
  tag: string;
}

export interface MatchSummary {
  platform: string;
  matchId: string;
  queueId: number;
  gameVersion: string;
  gameDuration: number;
  gameEndTimestamp: number;
  championName: string;
  champLevel: number;
  teamPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  items: number[];
  summonerSpells: number[];
  primaryRuneStyle: number | null;
  cs: number;
  visionScore: number;
  totalDamageDealtToChampions: number;
  multiKill: string | null;
  teamKills: number;
}

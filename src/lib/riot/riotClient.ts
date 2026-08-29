import { riotFetch } from "./riotFetch";
import { regionalFromPlatform } from "./regions";
import type {
  RiotAccount,
  SummonerDto,
  ChampionMasteryDto,
  LeagueEntryDto,
  MatchDto,
} from "./types";

export async function getAccountByRiotId(
  platform: string,
  gameName: string,
  tagLine: string
): Promise<RiotAccount> {
  const regional = regionalFromPlatform(platform);
  const url = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`;
  return riotFetch<RiotAccount>(url);
}

export async function getSummonerByPuuid(platform: string, puuid: string): Promise<SummonerDto> {
  // IMPORTANT: this must use the *platform* host (na1/euw1/kr), NOT americas/europe/asia
  const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return riotFetch<SummonerDto>(url);
}

// Match IDs (regional routing: americas/europe/asia/sea)
export async function getMatchIdsByPuuid(platform: string, puuid: string, count = 10): Promise<string[]> {
  const regional = regionalFromPlatform(platform);
  const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;
  return riotFetch<string[]>(url);
}

// Match details (regional routing)
export async function getMatchById(platform: string, matchId: string): Promise<MatchDto> {
  const regional = regionalFromPlatform(platform);
  const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  return riotFetch<MatchDto>(url);
}

export async function getLeagueEntriesByPuuid(platform: string, puuid: string): Promise<LeagueEntryDto[]> {
  const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
  return riotFetch<LeagueEntryDto[]>(url);
}

export async function getTopChampionMasteries(
  platform: string,
  puuid: string,
  count = 5
): Promise<ChampionMasteryDto[]> {
  const url = `https://${platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`;
  return riotFetch<ChampionMasteryDto[]>(url);
}

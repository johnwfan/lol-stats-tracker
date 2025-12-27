import { riotFetch } from "./riotFetch";
import { regionalFromPlatform } from "./regions";

export async function getAccountByRiotId(platform, gameName, tagLine) {
  const regional = regionalFromPlatform(platform);
  const url = `https://${regional}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    gameName
  )}/${encodeURIComponent(tagLine)}`;
  return riotFetch(url);
}

export async function getSummonerByPuuid(platform, puuid) {
  // IMPORTANT: this must use the *platform* host (na1/euw1/kr), NOT americas/europe/asia
  const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return riotFetch(url);
}

// Match IDs (regional routing: americas/europe/asia/sea)
export async function getMatchIdsByPuuid(platform, puuid, count = 10) {
  const regional = regionalFromPlatform(platform);
  const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;
  return riotFetch(url);
}

// Match details (regional routing)
export async function getMatchById(platform, matchId) {
  const regional = regionalFromPlatform(platform);
  const url = `https://${regional}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
  return riotFetch(url);
}

export async function getLeagueEntriesByPuuid(platform, puuid) {
  const url = `https://${platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`;
  return riotFetch(url);
}
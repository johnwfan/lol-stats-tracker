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
  const url = `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  return riotFetch(url);
}

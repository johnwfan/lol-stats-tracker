export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface SummonerDto {
  id: string;
  accountId?: string;
  puuid: string;
  profileIconId: number;
  revisionDate?: number;
  summonerLevel: number;
}

export interface LeagueEntryDto {
  leagueId?: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface ChampionMasteryDto {
  puuid: string;
  championId: number;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  tokensEarned: number;
  markRequiredForNextLevel?: number;
  championSeasonMilestone?: number;
  chestGranted?: boolean;
}

export interface PerkStyleDto {
  description: string;
  style: number;
  selections: { perk: number; var1: number; var2: number; var3: number }[];
}

export interface ParticipantDto {
  puuid: string;
  teamId: number;
  championName: string;
  champLevel: number;
  teamPosition: string;
  summonerName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  summoner1Id: number;
  summoner2Id: number;
  perks?: { styles: PerkStyleDto[] };
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
}

export interface MatchInfoDto {
  gameId: number;
  gameDuration: number;
  gameCreation: number;
  gameEndTimestamp?: number;
  gameVersion: string;
  queueId: number;
  participants: ParticipantDto[];
}

export interface MatchDto {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: MatchInfoDto;
}

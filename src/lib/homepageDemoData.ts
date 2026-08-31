import type { ChampionMap, MatchSummary, RankedData } from "@/types/domain";
import type { ChampionMasteryDto } from "@/lib/riot/types";

/**
 * Static, hand-authored data used only to render decorative previews on the
 * homepage (hero collage + product showcase). Typed against the real domain
 * types so the previews stay representative of actual API responses. Never
 * fetched from the network — no backend calls are made to render these.
 *
 * Timestamps are fixed constants rather than `Date.now() - offset`: this data
 * renders on the very first paint (no fetch/loading gate), so anything
 * wall-clock-dependent computes a different value on the server than on the
 * client a moment later and trips a hydration mismatch. `timeLabel` below
 * is a plain fixed string for the same reason — it is not run through the
 * live `formatRelativeTime` formatter.
 */
const FIXED_NOW = new Date("2026-01-15T18:00:00Z").getTime();

export const demoRanked: RankedData = {
  platform: "na1",
  puuid: "demo",
  rankedStatus: "RANKED",
  entries: [
    {
      queueType: "RANKED_SOLO_5x5",
      tier: "EMERALD",
      rank: "II",
      leaguePoints: 72,
      wins: 142,
      losses: 128,
      hotStreak: true,
      veteran: false,
      freshBlood: false,
      inactive: false,
    },
  ],
};

export const demoMatches: MatchSummary[] = [
  {
    platform: "na1",
    matchId: "demo-1",
    queueId: 420,
    gameVersion: "14.1.1",
    gameDuration: 1902,
    gameEndTimestamp: FIXED_NOW - 1000 * 60 * 40,
    championName: "Jinx",
    champLevel: 18,
    teamPosition: "BOTTOM",
    kills: 8,
    deaths: 2,
    assists: 11,
    win: true,
    items: [3031, 3094, 3006, 3072, 3036, 3363],
    summonerSpells: [4, 7],
    primaryRuneStyle: 8000,
    cs: 224,
    visionScore: 24,
    totalDamageDealtToChampions: 31840,
    multiKill: "Triple Kill",
    teamKills: 30,
  },
  {
    platform: "na1",
    matchId: "demo-2",
    queueId: 420,
    gameVersion: "14.1.1",
    gameDuration: 1580,
    gameEndTimestamp: FIXED_NOW - 1000 * 60 * 60 * 5,
    championName: "Thresh",
    champLevel: 14,
    teamPosition: "UTILITY",
    kills: 1,
    deaths: 5,
    assists: 14,
    win: false,
    items: [3853, 3067, 3158, 3111, 0, 0],
    summonerSpells: [4, 14],
    primaryRuneStyle: 8400,
    cs: 42,
    visionScore: 51,
    totalDamageDealtToChampions: 9820,
    multiKill: null,
    teamKills: 21,
  },
  {
    platform: "na1",
    matchId: "demo-3",
    queueId: 440,
    gameVersion: "14.1.1",
    gameDuration: 1985,
    gameEndTimestamp: FIXED_NOW - 1000 * 60 * 60 * 22,
    championName: "Yasuo",
    champLevel: 18,
    teamPosition: "MIDDLE",
    kills: 11,
    deaths: 4,
    assists: 6,
    win: true,
    items: [3031, 3006, 3046, 3072, 3139, 3363],
    summonerSpells: [4, 12],
    primaryRuneStyle: 8000,
    cs: 268,
    visionScore: 18,
    totalDamageDealtToChampions: 27110,
    multiKill: "Double Kill",
    teamKills: 24,
  },
  {
    platform: "na1",
    matchId: "demo-4",
    queueId: 450,
    gameVersion: "14.1.1",
    gameDuration: 1230,
    gameEndTimestamp: FIXED_NOW - 1000 * 60 * 60 * 24 * 2,
    championName: "LeeSin",
    champLevel: 16,
    teamPosition: "JUNGLE",
    kills: 4,
    deaths: 7,
    assists: 9,
    win: false,
    items: [1400, 3071, 3111, 3047, 0, 0],
    summonerSpells: [11, 4],
    primaryRuneStyle: 8100,
    cs: 96,
    visionScore: 12,
    totalDamageDealtToChampions: 14320,
    multiKill: null,
    teamKills: 19,
  },
];

export const demoChampionMap: ChampionMap = {
  222: { id: "Jinx", name: "Jinx" },
  103: { id: "Ahri", name: "Ahri" },
  64: { id: "LeeSin", name: "Lee Sin" },
};

export const demoMastery: ChampionMasteryDto[] = [
  {
    puuid: "demo",
    championId: 222,
    championLevel: 7,
    championPoints: 284310,
    lastPlayTime: FIXED_NOW - 1000 * 60 * 60 * 40,
    championPointsSinceLastLevel: 84310,
    championPointsUntilNextLevel: 0,
    tokensEarned: 0,
  },
  {
    puuid: "demo",
    championId: 103,
    championLevel: 7,
    championPoints: 196540,
    lastPlayTime: FIXED_NOW - 1000 * 60 * 60 * 24 * 3,
    championPointsSinceLastLevel: 46540,
    championPointsUntilNextLevel: 0,
    tokensEarned: 0,
  },
  {
    puuid: "demo",
    championId: 64,
    championLevel: 6,
    championPoints: 88220,
    lastPlayTime: FIXED_NOW - 1000 * 60 * 60 * 24 * 9,
    championPointsSinceLastLevel: 8220,
    championPointsUntilNextLevel: 21780,
    tokensEarned: 1,
  },
];

/** Fixed display strings for demoMatches rows — see the module doc comment for why these aren't computed via formatRelativeTime(). */
export const demoMatchTimeLabels: Record<string, string> = {
  "demo-1": "40 minutes ago",
  "demo-2": "5 hours ago",
  "demo-3": "22 hours ago",
  "demo-4": "2 days ago",
};

/** Champion used for the hero's background splash art. */
export const demoCollageChampion = "Ahri";

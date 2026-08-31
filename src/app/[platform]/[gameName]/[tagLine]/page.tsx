"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Card from "@/components/ui/Card";
import ProfileCard from "@/components/ProfileCard";
import RankedCard from "@/components/RankedCard";
import MatchList from "@/components/MatchList";
import ProfileSkeleton from "@/components/ProfileSkeleton";
import ChampionMastery from "@/components/ChampionMastery";
import PerformanceSummary from "@/components/PerformanceSummary";
import PerformanceTrend from "@/components/PerformanceTrend";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getLatestDdragonVersion, getChampionMap } from "@/lib/ddragon";
import type { MatchDto, ChampionMasteryDto } from "@/lib/riot/types";
import type { ProfileData, RankedData, MatchSummary, ChampionMap } from "@/types/domain";

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned an unexpected response (status ${res.status})`);
  }
}

export default function ProfilePage() {
  const params = useParams();
  const platform = (params?.platform || "").toString().toLowerCase();
  const gameName = (params?.gameName || "").toString();
  const tagLine = (params?.tagLine || "").toString();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [ranked, setRanked] = useState<RankedData | null>(null);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [mastery, setMastery] = useState<ChampionMasteryDto[]>([]);
  const [ddVersion, setDdVersion] = useState<string | null>(null);
  const [championMap, setChampionMap] = useState<ChampionMap | null>(null);

  useEffect(() => {
    getLatestDdragonVersion().then((v) => {
      setDdVersion(v);
      getChampionMap(v).then(setChampionMap);
    });
  }, []);

  useEffect(() => {
    if (!platform || !gameName || !tagLine) return;

    let cancelled = false;

    async function run() {
      setLoading(true);
      setNotFound(false);
      setError("");
      setProfile(null);
      setRanked(null);
      setMatches([]);
      setMastery([]);

      try {
        // 1) Profile
        const pRes = await fetch(
          `/api/lol/profile?platform=${encodeURIComponent(platform)}&name=${encodeURIComponent(
            gameName
          )}&tag=${encodeURIComponent(tagLine)}`
        );
        const pData = await parseJsonResponse(pRes);
        if (!pRes.ok) {
          if (pRes.status === 404) {
            if (!cancelled) setNotFound(true);
            return;
          }
          throw new Error(pData.error || "Profile fetch failed");
        }
        if (cancelled) return;
        setProfile(pData);

        // save recent search (non-blocking)
        fetch("/api/recent-searches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, name: gameName, tag: tagLine }),
        }).catch(() => {});

        // 2) Ranked + mastery (both puuid-based, fetch in parallel)
        const [rRes, maRes] = await Promise.all([
          fetch(`/api/lol/ranked?platform=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(pData.puuid)}`),
          fetch(`/api/lol/mastery?platform=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(pData.puuid)}`),
        ]);
        const rData = await parseJsonResponse(rRes);
        if (!rRes.ok) throw new Error(rData.error || "Ranked fetch failed");
        if (!cancelled) setRanked(rData);

        const maData = await parseJsonResponse(maRes);
        if (maRes.ok && !cancelled) setMastery(maData.masteries || []);

        // 3) Match IDs
        const mRes = await fetch(
          `/api/lol/matches?platform=${encodeURIComponent(platform)}&puuid=${encodeURIComponent(
            pData.puuid
          )}&count=10`
        );
        const mData = await parseJsonResponse(mRes);
        if (!mRes.ok) throw new Error(mData.error || "Matches fetch failed");

        // 4) Match details (batch to reduce rate-limit risk)
        const ids: string[] = mData.matchIds || [];
        const results: MatchDto[] = [];

        for (let i = 0; i < ids.length; i += 2) {
          const batch = ids.slice(i, i + 2);
          const batchData = await Promise.all(
            batch.map(async (matchId) => {
              const res = await fetch(
                `/api/lol/match?platform=${encodeURIComponent(platform)}&matchId=${encodeURIComponent(matchId)}`
              );
              const data = await parseJsonResponse(res);
              if (!res.ok) throw new Error(data.error || "Match fetch failed");
              return data.match as MatchDto;
            })
          );
          results.push(...batchData);
        }

        const summaries: MatchSummary[] = results
          .map((match): MatchSummary | null => {
            const info = match?.info;
            const me = info?.participants?.find((p) => p.puuid === pData.puuid);
            if (!info || !me) return null;

            const teamKills = info.participants
              .filter((p) => p.teamId === me.teamId)
              .reduce((s, p) => s + (p.kills || 0), 0);

            const multiKill = me.pentaKills
              ? "Penta Kill"
              : me.quadraKills
              ? "Quadra Kill"
              : me.tripleKills
              ? "Triple Kill"
              : me.doubleKills
              ? "Double Kill"
              : null;

            return {
              platform,
              matchId: match?.metadata?.matchId,
              queueId: info.queueId,
              gameVersion: info.gameVersion,
              gameDuration: info.gameDuration,
              gameEndTimestamp: info.gameEndTimestamp ?? info.gameCreation,
              championName: me.championName,
              champLevel: me.champLevel,
              teamPosition: me.teamPosition || "—",
              kills: me.kills,
              deaths: me.deaths,
              assists: me.assists,
              win: me.win,
              items: [me.item0, me.item1, me.item2, me.item3, me.item4, me.item5, me.item6],
              summonerSpells: [me.summoner1Id, me.summoner2Id],
              primaryRuneStyle: me.perks?.styles?.[0]?.style ?? null,
              cs: (me.totalMinionsKilled || 0) + (me.neutralMinionsKilled || 0),
              visionScore: me.visionScore ?? 0,
              totalDamageDealtToChampions: me.totalDamageDealtToChampions ?? 0,
              multiKill,
              teamKills,
            };
          })
          .filter((s): s is MatchSummary => s !== null);

        if (!cancelled) setMatches(summaries);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [platform, gameName, tagLine]);

  return (
    <main>
      <Navbar backHref="/" backLabel="Back to search" />

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        {loading ? (
          <ProfileSkeleton />
        ) : notFound ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="text-text-primary font-medium">
              Scuttle couldn&apos;t find {gameName}#{tagLine} on {platform.toUpperCase()}.
            </div>
            <div className="text-sm text-text-muted">Double-check the name, tag, and region and try again.</div>
          </div>
        ) : error ? (
          <ErrorBanner message={error} />
        ) : profile ? (
          <>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
              <ProfileCard profile={profile} platform={platform} ddVersion={ddVersion} />
              {ranked && <RankedCard ranked={ranked} />}
            </div>

            {(mastery.length > 0 || matches.length > 0) && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {mastery.length > 0 && (
                  <Card hover={false} className="p-4 md:p-5">
                    <ChampionMastery masteries={mastery} championMap={championMap} />
                  </Card>
                )}
                {matches.length > 0 && (
                  <Card hover={false} className="p-4 md:p-5">
                    <PerformanceSummary matches={matches} bare />
                    {matches.length > 1 && <PerformanceTrend matches={matches} bare />}
                  </Card>
                )}
              </div>
            )}

            {matches.length > 0 && <MatchList matches={matches} ddVersion={ddVersion} />}
          </>
        ) : null}
      </div>
    </main>
  );
}

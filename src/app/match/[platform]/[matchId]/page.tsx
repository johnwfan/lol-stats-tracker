"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import MatchTeamTable from "@/components/MatchTeamTable";
import MatchSkeleton from "@/components/MatchSkeleton";
import ErrorBanner from "@/components/ui/ErrorBanner";
import { getLatestDdragonVersion } from "@/lib/ddragon";
import { queueName } from "@/lib/queues";
import { formatDuration } from "@/lib/utils";
import type { MatchDto, ParticipantDto } from "@/lib/riot/types";

async function parseJsonResponse(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server returned an unexpected response (status ${res.status})`);
  }
}

export default function MatchPage() {
  const params = useParams(); // ✅ always reflects /match/:platform/:matchId
  const platform = (params?.platform || "").toString().toLowerCase();
  const matchId = (params?.matchId || "").toString();

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState<MatchDto | null>(null);
  const [error, setError] = useState("");
  const [ddVersion, setDdVersion] = useState<string | null>(null);

  useEffect(() => {
    getLatestDdragonVersion().then(setDdVersion);
  }, []);

  useEffect(() => {
    if (!platform || !matchId) return;

    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/lol/match?platform=${encodeURIComponent(platform)}&matchId=${encodeURIComponent(matchId)}`);
        const data = await parseJsonResponse(res);
        if (!res.ok) throw new Error(data.error || "Failed to load match");
        if (!cancelled) setMatch(data.match);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load match");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [platform, matchId]);

  const info = match?.info;
  const participants = useMemo(() => info?.participants || [], [info]);
  const teams = useMemo(() => {
    const map = new Map<number, ParticipantDto[]>();
    for (const p of participants) {
      const id = p.teamId;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(p);
    }
    // sort team ids so 100/200 show nicely for normal games
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [participants]);

  const blueTeam = teams.find(([id]) => id === 100)?.[1] ?? [];
  const redTeam = teams.find(([id]) => id === 200)?.[1] ?? [];
  const blueKills = blueTeam.reduce((s, p) => s + (p.kills || 0), 0);
  const redKills = redTeam.reduce((s, p) => s + (p.kills || 0), 0);
  const blueWon = blueTeam[0]?.win ?? false;

  return (
    <main>
      <Navbar backHref="/" backLabel="Back" />

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {!platform || !matchId ? (
          <div className="text-text-secondary">Bad URL. Expected /match/&lt;platform&gt;/&lt;matchId&gt;.</div>
        ) : loading ? (
          <MatchSkeleton />
        ) : error ? (
          <ErrorBanner message={error} />
        ) : (
          <>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {info ? queueName(info.queueId) : "Match"}
                {info ? ` · ${formatDuration(info.gameDuration)}` : ""}
              </div>
              {info && teams.length === 2 ? (
                <div className="mt-1 flex items-baseline gap-2 font-display text-2xl font-bold md:text-3xl">
                  <span className={blueWon ? "text-win" : "text-loss"}>Blue {blueKills}</span>
                  <span className="text-text-muted">—</span>
                  <span className={blueWon ? "text-loss" : "text-win"}>{redKills} Red</span>
                </div>
              ) : (
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
                  Match <span className="text-text-muted">{matchId}</span>
                </h1>
              )}
            </div>

            <div className="grid gap-6">
              {teams.map(([teamId, arr]) => (
                <MatchTeamTable key={teamId} teamId={teamId} participants={arr} ddVersion={ddVersion} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

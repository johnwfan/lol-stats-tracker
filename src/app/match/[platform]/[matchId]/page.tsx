"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import MatchTeamTable from "@/components/MatchTeamTable";
import ErrorBanner from "@/components/ui/ErrorBanner";
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

  return (
    <main>
      <Navbar backHref="/" backLabel="Back" />

      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">
            Match <span className="text-text-muted">{matchId || "(loading...)"}</span>
          </h1>
          <div className="mt-1 text-sm text-text-secondary">
            Platform {platform ? platform.toUpperCase() : "(loading)"} • Queue {info?.queueId ?? "—"} • Duration{" "}
            {info?.gameDuration ? `${Math.round(info.gameDuration / 60)}m` : "—"}
          </div>
        </div>

        {!platform || !matchId ? (
          <div className="text-text-secondary">Bad URL. Expected /match/&lt;platform&gt;/&lt;matchId&gt;.</div>
        ) : loading ? (
          <div className="text-text-secondary">Loading match…</div>
        ) : error ? (
          <ErrorBanner message={error} />
        ) : (
          <div className="grid gap-6">
            {teams.map(([teamId, arr]) => (
              <MatchTeamTable key={teamId} teamId={teamId} participants={arr} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function teamName(teamId) {
  if (teamId === 100) return "Blue Team";
  if (teamId === 200) return "Red Team";
  return `Team ${teamId}`;
}

function sumCS(p) {
  return (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
}

// same tile trick you used already (no version needed)
const CHAMPION_DDRAGON_EXCEPTIONS = {
  FiddleSticks: "Fiddlesticks",
  Wukong: "MonkeyKing",
  KhaZix: "Khazix",
  ChoGath: "Chogath",
  LeBlanc: "Leblanc",
};
function champTile(championName) {
  const champ = CHAMPION_DDRAGON_EXCEPTIONS[championName] || championName;
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/tiles/${champ}_0.jpg`;
}

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function MatchPage() {
  const params = useParams(); // ✅ always reflects /match/:platform/:matchId
  const platform = (params?.platform || "").toString().toLowerCase();
  const matchId = (params?.matchId || "").toString();

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!platform || !matchId) return;

    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/lol/match?platform=${encodeURIComponent(platform)}&matchId=${encodeURIComponent(matchId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load match");
        if (!cancelled) setMatch(data.match);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load match");
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
  const participants = info?.participants || [];
  const teams = useMemo(() => {
  const map = new Map();
  for (const p of participants) {
    const id = p.teamId ?? "unknown";
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(p);
  }
  // sort team ids so 100/200 show nicely for normal games
  return Array.from(map.entries()).sort(([a], [b]) => Number(a) - Number(b));
}, [participants]);

  function TeamTable({ teamId, arr }) {
    const stripe = teamId === 100 ? "border-l-emerald-400/60" : "border-l-rose-400/60";
    return (
      <div className={cx("rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4 border-l-4", stripe)}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{teamName(teamId)}</div>
          <div className="text-xs text-white/50">
            {arr.reduce((s, p) => s + (p.kills || 0), 0)} / {arr.reduce((s, p) => s + (p.deaths || 0), 0)} /{" "}
            {arr.reduce((s, p) => s + (p.assists || 0), 0)}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left font-medium py-2">Player</th>
                <th className="text-left font-medium py-2">K/D/A</th>
                <th className="text-right font-medium py-2">CS</th>
                <th className="text-right font-medium py-2">Gold</th>
                <th className="text-right font-medium py-2">Dmg</th>
                <th className="text-right font-medium py-2">Vision</th>
              </tr>
            </thead>
            <tbody>
              {arr.map((p) => (
                <tr key={p.puuid} className="border-t border-white/10">
                  <td className="py-2">
                    <div className="flex items-center gap-3 min-w-[260px]">
                      <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/10 bg-black/30 shrink-0">
                        <img
                          src={champTile(p.championName)}
                          alt={p.championName}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.summonerName}</div>
                        <div className="text-xs text-white/50 truncate">{p.championName}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-2 font-mono">
                    {p.kills}/{p.deaths}/{p.assists}
                  </td>

                  <td className="py-2 text-right">{sumCS(p)}</td>
                  <td className="py-2 text-right">{(p.goldEarned || 0).toLocaleString()}</td>
                  <td className="py-2 text-right">{(p.totalDamageDealtToChampions || 0).toLocaleString()}</td>
                  <td className="py-2 text-right">{p.visionScore ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Match <span className="text-white/50">{matchId || "(loading...)"}</span>
            </h1>
            <div className="mt-1 text-sm text-white/60">
              Platform {platform ? platform.toUpperCase() : "(loading)"} • Queue {info?.queueId ?? "—"} • Duration{" "}
              {info?.gameDuration ? `${Math.round(info.gameDuration / 60)}m` : "—"}
            </div>
          </div>

          <a href="/" className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm hover:bg-black/30">
            ← Back
          </a>
        </div>

        {!platform || !matchId ? (
          <div className="text-white/70">Bad URL. Expected /match/&lt;platform&gt;/&lt;matchId&gt;.</div>
        ) : loading ? (
          <div className="text-white/70">Loading match…</div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300">{error}</div>
        ) : (
          <div className="grid gap-6">
            {teams.map(([teamId, arr]) => (
                <TeamTable key={teamId} teamId={Number(teamId)} arr={arr} />
            ))}
            </div>

        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { championIconUrl, itemIconUrl, getLatestDdragonVersion } from "@/lib/ddragon";
import { queueName } from "@/lib/queues";
import { formatDuration } from "@/lib/utils";
import { demoChampionMap, demoMastery, demoMatches, demoMatchTimeLabels, demoRanked } from "@/lib/homepageDemoData";

function kda(k: number, d: number, a: number): string {
  return ((k + a) / Math.max(d, 1)).toFixed(2);
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-hp-red">
      {label}
    </div>
  );
}

function RankedGlance() {
  const entry = demoRanked.entries[0];
  const winRate = Math.round((entry.wins / Math.max(entry.wins + entry.losses, 1)) * 100);

  return (
    <div className="rounded-2xl border border-hp-navy bg-hp-ink p-6 shadow-[0_20px_40px_rgba(0,0,0,0.14)] lg:p-7">
      <SectionLabel label="Ranked" />
      <h3 className="mt-2 text-2xl font-bold text-white lg:text-3xl">where am I at?</h3>

      <div className="mt-6 font-display text-3xl font-bold tracking-tight text-hp-red lg:text-4xl">
        {entry.tier} {entry.rank}
      </div>
      <div className="mt-1 font-mono text-sm text-white/60">{entry.leaguePoints} LP</div>

      <div className="mt-6 flex items-center gap-5 border-t border-hp-navy pt-4 text-sm">
        <div>
          <div className="font-mono font-semibold text-white">
            {entry.wins}W <span className="text-white/40">–</span> {entry.losses}L
          </div>
          <div className="mt-0.5 text-xs text-white/50">Record</div>
        </div>
        <div>
          <div className="font-mono font-semibold text-white">{winRate}%</div>
          <div className="mt-0.5 text-xs text-white/50">Win rate</div>
        </div>
        {entry.hotStreak ? (
          <div className="rounded-full border border-hp-red/30 bg-hp-red/10 px-2.5 py-1 text-[11px] font-semibold text-hp-red">
            Hot streak
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LastTen({ ddVersion }: { ddVersion: string | null }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hp-navy bg-hp-ink shadow-[0_20px_40px_rgba(0,0,0,0.14)]">
      <div className="p-6 pb-3 lg:p-7 lg:pb-3">
        <SectionLabel label="Matches" />
        <h3 className="mt-2 text-2xl font-bold text-white lg:text-3xl">
          the good, the bad, and the 0/8 game.
        </h3>
      </div>

      <div className="divide-y divide-hp-navy">
        {demoMatches.map((m) => {
          const icon = championIconUrl(m.championName);
          return (
            <div key={m.matchId} className="flex items-center gap-3 px-6 py-3.5 lg:px-7">
              <div className={`h-11 w-11 shrink-0 overflow-hidden rounded-lg border-l-[3px] ${m.win ? "border-hp-win" : "border-hp-red"}`}>
                {icon ? <img src={icon} alt={m.championName} className="h-full w-full object-cover" loading="lazy" /> : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-sm font-semibold text-white">{m.championName}</span>
                  <span className={`text-[11px] font-bold uppercase tracking-wide ${m.win ? "text-hp-win" : "text-hp-red"}`}>
                    {m.win ? "Victory" : "Defeat"}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-white/50">
                  <span>{queueName(m.queueId)}</span>
                  <span>·</span>
                  <span>{m.teamPosition}</span>
                  <span>·</span>
                  <span className="font-mono">{formatDuration(m.gameDuration)}</span>
                  <span>·</span>
                  <span>{demoMatchTimeLabels[m.matchId]}</span>
                </div>
              </div>

              <div className="hidden items-center gap-1 sm:flex">
                {m.items
                  .filter((id) => id)
                  .slice(0, 4)
                  .map((id, i) => (
                    <img
                      key={i}
                      src={itemIconUrl(id, ddVersion) ?? undefined}
                      alt=""
                      className="h-5 w-5 rounded"
                      loading="lazy"
                    />
                  ))}
              </div>

              <div className="shrink-0 text-right">
                <div className="font-mono text-sm font-bold text-white">
                  {m.kills}<span className="text-white/40">/</span>
                  <span className="text-hp-red">{m.deaths}</span><span className="text-white/40">/</span>
                  {m.assists}
                </div>
                <div className="font-mono text-[11px] text-white/50">{kda(m.kills, m.deaths, m.assists)} KDA</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComfortPicks() {
  const rotations = ["-rotate-3", "rotate-2", "-rotate-1"];

  return (
    <div className="max-w-md">
      <SectionLabel label="Mastery" />
      <h3 className="mt-2 text-2xl font-bold text-hp-ink lg:text-3xl">
        view champion mastery.
      </h3>

      <div className="mt-6 flex items-end pl-2">
        {demoMastery.map((m, i) => {
          const champ = demoChampionMap[m.championId];
          const icon = champ ? championIconUrl(champ.id) : null;
          return (
            <div
              key={m.championId}
              className={`relative ${i === 0 ? "" : "-ml-6"} h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white shadow-[0_14px_30px_rgba(0,0,0,0.28)] transition hover:z-20 hover:-translate-y-2 lg:h-28 lg:w-28 ${rotations[i % rotations.length]}`}
              style={{ zIndex: i + 1 }}
            >
              {icon ? <img src={icon} alt={champ?.name} className="h-full w-full object-cover" loading="lazy" /> : null}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-hp-ink/90 to-transparent px-2 pb-1.5 pt-5 text-[11px] font-semibold text-white">
                Lv {m.championLevel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProductShowcase() {
  const [ddVersion, setDdVersion] = useState<string | null>(null);

  useEffect(() => {
    getLatestDdragonVersion().then(setDdVersion);
  }, []);

  return (
    <section className="mx-auto w-full max-w-[1280px] px-4 py-20 md:px-6 lg:py-28">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-10">
        <h2 className="font-display text-4xl font-black leading-[0.95] tracking-tight text-hp-ink sm:text-5xl lg:text-6xl">
          TYPE A NAME.
          <br />
          SEE EVERYTHING.
        </h2>
        <p className="max-w-xs text-sm text-hp-muted lg:text-[1rem]">
          scuttle.gg turns Riot&apos;s raw match data into something you can actually read.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <RankedGlance />
        </div>
        <div className="lg:col-span-7">
          <LastTen ddVersion={ddVersion} />
        </div>
      </div>

      <div className="mt-14 lg:mt-16">
        <ComfortPicks />
      </div>
    </section>
  );
}

import Link from "next/link";
import { championIconUrl, itemIconUrl } from "@/lib/ddragon";
import { cn, formatRelativeTime, formatDuration } from "@/lib/utils";
import { queueName } from "@/lib/queues";
import type { MatchSummary } from "@/types/domain";

function kda(k: number, d: number, a: number): string {
  const denom = d === 0 ? 1 : d;
  return ((k + a) / denom).toFixed(2);
}

interface MatchListItemProps {
  match: MatchSummary;
  ddVersion: string | null;
}

export default function MatchListItem({ match: m, ddVersion }: MatchListItemProps) {
  const stripe = m.win ? "border-l-win/60" : "border-l-loss/60";
  const icon = championIconUrl(m.championName);
  const csPerMin = m.gameDuration ? (m.cs / (m.gameDuration / 60)).toFixed(1) : "—";
  const killParticipation = m.teamKills ? Math.round(((m.kills + m.assists) / m.teamKills) * 100) : null;

  return (
    <Link
      href={`/match/${m.platform}/${m.matchId}`}
      className={cn(
        "block rounded-xl border-l-4 bg-card/40 px-4 py-3 transition hover:bg-overlay-hover",
        stripe
      )}
    >
      {/* Primary tier */}
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="h-12 w-12 overflow-hidden rounded-lg border border-border bg-surface">
            {icon ? (
              <img
                src={icon}
                alt={m.championName}
                className="h-full w-full object-cover object-center"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>
          {m.champLevel ? (
            <span className="absolute -bottom-1 -right-1 rounded-full border border-border bg-base px-1 text-[10px] font-semibold text-text-secondary">
              {m.champLevel}
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-text-primary">{m.championName}</span>
            <span className={cn("text-xs font-bold uppercase tracking-wide", m.win ? "text-win" : "text-loss")}>
              {m.win ? "Victory" : "Defeat"}
            </span>
            {m.multiKill ? (
              <span className="rounded-full bg-periwinkle-soft px-2 py-0.5 text-[10px] font-semibold text-periwinkle">
                {m.multiKill}
              </span>
            ) : null}
          </div>
          {/* Secondary tier */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-text-secondary">
            <span>{queueName(m.queueId)}</span>
            <span className="text-text-muted">•</span>
            <span>{m.teamPosition}</span>
            <span className="text-text-muted">•</span>
            <span>{formatRelativeTime(m.gameEndTimestamp)}</span>
            <span className="text-text-muted">•</span>
            <span className="font-mono">{formatDuration(m.gameDuration)}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="font-mono text-base font-bold text-text-primary">
            {m.kills}<span className="text-text-muted">/</span>
            <span className="text-loss">{m.deaths}</span><span className="text-text-muted">/</span>
            {m.assists}
          </div>
          <div className="font-mono text-xs font-medium text-text-secondary">{kda(m.kills, m.deaths, m.assists)} KDA</div>
        </div>
      </div>

      {/* Tertiary tier */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex items-center gap-1">
          {m.items
            ?.filter((id) => id)
            .map((id, i) => (
              <img
                key={i}
                src={itemIconUrl(id, ddVersion) ?? undefined}
                alt=""
                className="h-6 w-6 rounded opacity-90"
                loading="lazy"
              />
            ))}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-text-muted">
          <span>
            {m.cs} CS ({csPerMin}/min)
          </span>
          {killParticipation != null ? <span>{killParticipation}% KP</span> : null}
        </div>
      </div>
    </Link>
  );
}

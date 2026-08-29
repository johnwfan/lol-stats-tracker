import { ChevronRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import {
  championIconUrl,
  itemIconUrl,
  summonerSpellIconUrl,
  runeStyleIconUrl,
} from "@/lib/ddragon";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { MatchSummary } from "@/types/domain";

const QUEUE_NAMES: Record<number, string> = {
  0: "Custom",
  400: "Normal Draft",
  430: "Normal Blind",
  440: "Ranked Flex",
  420: "Ranked Solo/Duo",
  450: "ARAM",
  490: "Quickplay",
  700: "Clash",
  830: "Co-op vs AI (Intro)",
  840: "Co-op vs AI (Beginner)",
  850: "Co-op vs AI (Intermediate)",
  900: "URF",
  1020: "One for All",
  1300: "Nexus Blitz",
  1400: "Ultimate Spellbook",
  1700: "Arena",
};

function queueName(queueId: number): string {
  return QUEUE_NAMES[queueId] || `Queue ${queueId}`;
}

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
    <a
      href={`/match/${m.platform}/${m.matchId}`}
      className={cn(
        "block rounded-2xl border border-border bg-surface p-3",
        "border-l-4",
        stripe,
        "transition hover:bg-overlay-hover",
        "shadow-sm hover:shadow-lg",
        m.win ? "hover:shadow-win/10" : "hover:shadow-loss/10"
      )}
    >
      <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="h-11 w-11 overflow-hidden rounded-xl border border-border bg-surface">
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
              <div className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-border bg-card px-0.5 text-[10px] font-semibold text-text-primary">
                {m.champLevel}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-col gap-0.5">
            {m.summonerSpells?.map((spellId, i) => {
              const url = summonerSpellIconUrl(spellId, ddVersion);
              return url ? (
                <img key={i} src={url} alt="" className="h-[18px] w-[18px] rounded" loading="lazy" />
              ) : (
                <div key={i} className="h-[18px] w-[18px] rounded bg-border" />
              );
            })}
          </div>

          {m.primaryRuneStyle ? (
            <img
              src={runeStyleIconUrl(m.primaryRuneStyle) ?? undefined}
              alt=""
              className="h-5 w-5 shrink-0"
              loading="lazy"
            />
          ) : null}

          <div className="min-w-0">
            <div className="text-base font-semibold truncate text-text-primary">{m.championName}</div>
            <div className="text-sm text-text-secondary truncate">
              {queueName(m.queueId)} • {m.teamPosition}
            </div>
          </div>
        </div>

        <div className="justify-self-center flex flex-col items-center gap-1">
          <Badge tone={m.win ? "win" : "loss"}>{m.win ? "WIN" : "LOSS"}</Badge>
          {m.multiKill ? <Badge tone="warning">{m.multiKill}</Badge> : null}
        </div>

        <div className="justify-self-end text-right">
          <div className="font-mono text-sm text-text-primary">
            {m.kills}/{m.deaths}/{m.assists}
          </div>
          <div className="text-xs text-text-secondary">
            KDA <span className="text-text-primary">{kda(m.kills, m.deaths, m.assists)}</span>
          </div>
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <div className="flex items-center gap-1">
          {m.items
            ?.filter((id) => id)
            .map((id, i) => (
              <img
                key={i}
                src={itemIconUrl(id, ddVersion) ?? undefined}
                alt=""
                className="h-5 w-5 rounded border border-border"
                loading="lazy"
              />
            ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>
            CS <span className="text-text-secondary">{m.cs}</span> ({csPerMin}/min)
          </span>
          {killParticipation != null ? (
            <span>
              KP <span className="text-text-secondary">{killParticipation}%</span>
            </span>
          ) : null}
          <span>{formatRelativeTime(m.gameEndTimestamp)}</span>
        </div>
      </div>
    </a>
  );
}

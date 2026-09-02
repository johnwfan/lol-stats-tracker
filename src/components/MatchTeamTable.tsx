import { championIconUrl, itemIconUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { ParticipantDto } from "@/lib/riot/types";

function teamName(teamId: number): string {
  if (teamId === 100) return "Blue Team";
  if (teamId === 200) return "Red Team";
  return `Team ${teamId}`;
}

function sumCS(p: ParticipantDto): number {
  return (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0);
}

interface MatchTeamTableProps {
  teamId: number;
  participants: ParticipantDto[];
  ddVersion: string | null;
}

const COLS = "grid-cols-[1.7fr_0.8fr_0.5fr_0.6fr_0.6fr_0.5fr_1.3fr]";

export default function MatchTeamTable({ teamId, participants, ddVersion }: MatchTeamTableProps) {
  const teamWon = participants[0]?.win ?? false;
  const teamKills = participants.reduce((s, p) => s + (p.kills || 0), 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5",
          teamWon ? "bg-win-soft" : "bg-loss-soft"
        )}
      >
        <span className={cn("text-sm font-bold uppercase tracking-wide", teamWon ? "text-win" : "text-loss")}>
          {teamName(teamId)} · {teamWon ? "Victory" : "Defeat"}
        </span>
        <span className="font-mono text-sm font-semibold text-text-secondary">{teamKills} kills</span>
      </div>

      {/* Below `sm`, the 7-column grid has no room to breathe -- stack each player as a card instead. */}
      <div className="sm:hidden divide-y divide-border">
        {participants.map((p) => (
          <div key={p.puuid} className="px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img
                src={championIconUrl(p.championName) ?? undefined}
                alt={p.championName}
                className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary">{p.summonerName}</div>
                <div className="truncate text-xs text-text-muted">{p.championName}</div>
              </div>
              <div className="shrink-0 text-right font-mono text-sm text-text-secondary">
                {p.kills}<span className="text-text-muted">/</span>
                <span className="text-loss">{p.deaths}</span><span className="text-text-muted">/</span>
                {p.assists}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-text-muted">
              <span>{sumCS(p)} CS</span>
              <span>{((p.goldEarned || 0) / 1000).toFixed(1)}k gold</span>
              <span>{((p.totalDamageDealtToChampions || 0) / 1000).toFixed(1)}k dmg</span>
              <span>{p.visionScore ?? 0} vision</span>
            </div>

            <div className="mt-2 flex gap-1">
              {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((id, i) => (
                <img
                  key={i}
                  src={itemIconUrl(id, ddVersion) ?? undefined}
                  alt=""
                  className={cn("h-6 w-6 rounded", !id && "bg-surface")}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* `sm` and up: the full comparative grid, with real headers. */}
      <div className="hidden overflow-x-auto sm:block">
        <div className={cn("grid min-w-[640px] gap-2 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wide text-text-muted", COLS)}>
          <span>Player</span>
          <span>KDA</span>
          <span className="text-right">CS</span>
          <span className="text-right">Gold</span>
          <span className="text-right">Dmg</span>
          <span className="text-right">Vision</span>
          <span>Items</span>
        </div>

        {participants.map((p) => (
          <div
            key={p.puuid}
            className={cn(
              "grid min-w-[640px] items-center gap-2 border-b border-border px-4 py-2.5 text-sm last:border-b-0 hover:bg-overlay-hover",
              COLS
            )}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <img
                src={championIconUrl(p.championName) ?? undefined}
                alt={p.championName}
                className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <div className="truncate font-medium text-text-primary">{p.summonerName}</div>
                <div className="truncate text-xs text-text-muted">{p.championName}</div>
              </div>
            </div>

            <div className="font-mono text-text-secondary">
              {p.kills}<span className="text-text-muted">/</span>
              <span className="text-loss">{p.deaths}</span><span className="text-text-muted">/</span>
              {p.assists}
            </div>

            <div className="text-right font-mono text-text-secondary">{sumCS(p)}</div>
            <div className="text-right font-mono text-text-secondary">
              {((p.goldEarned || 0) / 1000).toFixed(1)}k
            </div>
            <div className="text-right font-mono text-text-secondary">
              {((p.totalDamageDealtToChampions || 0) / 1000).toFixed(1)}k
            </div>
            <div className="text-right font-mono text-text-secondary">{p.visionScore ?? 0}</div>

            <div className="flex gap-1">
              {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((id, i) => (
                <img
                  key={i}
                  src={itemIconUrl(id, ddVersion) ?? undefined}
                  alt=""
                  className={cn("h-6 w-6 rounded", !id && "bg-surface")}
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

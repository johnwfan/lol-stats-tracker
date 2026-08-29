import { championIconUrl } from "@/lib/ddragon";
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
}

export default function MatchTeamTable({ teamId, participants }: MatchTeamTableProps) {
  const stripe = teamId === 100 ? "border-l-win/60" : "border-l-loss/60";

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 border-l-4 shadow-[0_1px_2px_0_var(--color-shadow)]",
        stripe
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-text-primary">{teamName(teamId)}</div>
        <div className="text-xs text-text-muted">
          {participants.reduce((s, p) => s + (p.kills || 0), 0)} /{" "}
          {participants.reduce((s, p) => s + (p.deaths || 0), 0)} /{" "}
          {participants.reduce((s, p) => s + (p.assists || 0), 0)}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-secondary">
            <tr>
              <th className="text-left font-medium py-2 px-2">Player</th>
              <th className="text-left font-medium py-2 px-2">K/D/A</th>
              <th className="text-right font-medium py-2 px-2">CS</th>
              <th className="text-right font-medium py-2 px-2">Gold</th>
              <th className="text-right font-medium py-2 px-2">Dmg</th>
              <th className="text-right font-medium py-2 px-2">Vision</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p) => (
              <tr key={p.puuid} className="border-t border-border">
                <td className="py-2 px-2">
                  <div className="flex items-center gap-3 min-w-[260px]">
                    <div className="h-10 w-10 overflow-hidden rounded-xl border border-border bg-surface shrink-0">
                      <img
                        src={championIconUrl(p.championName) ?? undefined}
                        alt={p.championName}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-text-primary">{p.summonerName}</div>
                      <div className="text-xs text-text-muted truncate">{p.championName}</div>
                    </div>
                  </div>
                </td>

                <td className="py-2 px-2 font-mono text-text-primary">
                  {p.kills}/{p.deaths}/{p.assists}
                </td>

                <td className="py-2 px-2 text-right text-text-primary">{sumCS(p)}</td>
                <td className="py-2 px-2 text-right text-text-primary">{(p.goldEarned || 0).toLocaleString()}</td>
                <td className="py-2 px-2 text-right text-text-primary">
                  {(p.totalDamageDealtToChampions || 0).toLocaleString()}
                </td>
                <td className="py-2 px-2 text-right text-text-primary">{p.visionScore ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

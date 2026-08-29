import Card from "@/components/ui/Card";
import StatTile from "@/components/ui/StatTile";
import type { MatchSummary } from "@/types/domain";

interface PerformanceSummaryProps {
  matches: MatchSummary[];
}

export default function PerformanceSummary({ matches }: PerformanceSummaryProps) {
  if (!matches || matches.length === 0) return null;

  const total = matches.length;
  const wins = matches.filter((m) => m.win).length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const avgKDA = (
    matches.reduce((s, m) => {
      const ratio = m.deaths === 0 ? m.kills + m.assists : (m.kills + m.assists) / m.deaths;
      return s + ratio;
    }, 0) / total
  ).toFixed(2);

  const champCounts = matches.reduce<Record<string, number>>((acc, m) => {
    acc[m.championName] = (acc[m.championName] || 0) + 1;
    return acc;
  }, {});
  const mostPlayedEntry = Object.entries(champCounts).sort((a, b) => b[1] - a[1])[0];
  const mostPlayed = mostPlayedEntry ? `${mostPlayedEntry[0]} (${mostPlayedEntry[1]})` : "—";

  return (
    <Card hover={false} className="p-4 md:p-5">
      <div className="text-lg font-semibold text-text-primary">Last {total} Games</div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatTile label="Win Rate" value={`${winRate}%`} />
        <StatTile label="Avg KDA" value={avgKDA} />
        <StatTile label="Most Played" value={mostPlayed} />
      </div>
    </Card>
  );
}

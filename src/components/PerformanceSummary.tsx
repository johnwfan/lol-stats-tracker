import Card from "@/components/ui/Card";
import StatRow from "@/components/ui/StatRow";
import type { MatchSummary } from "@/types/domain";

interface PerformanceSummaryProps {
  matches: MatchSummary[];
  bare?: boolean;
}

export default function PerformanceSummary({ matches, bare = false }: PerformanceSummaryProps) {
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

  const content = (
    <>
      <div className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Last {total} Games
      </div>
      <StatRow
        className="mt-3"
        items={[
          { label: "Win Rate", value: `${winRate}%` },
          { label: "Avg KDA", value: avgKDA },
          { label: "Most Played", value: mostPlayed },
        ]}
      />
    </>
  );

  if (bare) return content;

  return (
    <Card hover={false} className="p-4 md:p-5">
      {content}
    </Card>
  );
}

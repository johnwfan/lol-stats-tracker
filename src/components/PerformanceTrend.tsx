"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { MatchSummary } from "@/types/domain";

interface PerformanceTrendProps {
  matches: MatchSummary[];
  bare?: boolean;
}

interface ChartPoint {
  game: number;
  kda: number;
  win: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: { value: number; payload: ChartPoint }[];
}

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-border-strong bg-card px-3 py-2 shadow-[0_10px_15px_-3px_var(--color-shadow)]">
      <div className="text-xs font-semibold text-text-primary">Game {label}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className={cn("h-2 w-2 shrink-0 rounded-full", point.win ? "bg-win" : "bg-loss")} />
        <span className="text-text-secondary">
          KDA <span className="font-semibold text-text-primary">{point.kda}</span>
        </span>
        <span className={cn("font-semibold", point.win ? "text-win" : "text-loss")}>
          {point.win ? "WIN" : "LOSS"}
        </span>
      </div>
    </div>
  );
}

export default function PerformanceTrend({ matches, bare = false }: PerformanceTrendProps) {
  if (!matches || matches.length === 0) return null;

  const data: ChartPoint[] = [...matches].reverse().map((m, i) => ({
    game: i + 1,
    kda: m.deaths === 0 ? m.kills + m.assists : Number(((m.kills + m.assists) / m.deaths).toFixed(2)),
    win: m.win,
  }));

  const content = (
    <>
      <div className={cn("text-sm font-semibold uppercase tracking-wide text-text-secondary", bare && "mt-5")}>
        KDA Trend
      </div>
      <ResponsiveContainer width="100%" height={160} className="mt-3">
        <BarChart data={data}>
          <XAxis dataKey="game" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} stroke="var(--color-border)" />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} stroke="var(--color-border)" />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-overlay-hover)" }} />
          <Bar dataKey="kda" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.win ? "var(--color-win)" : "var(--color-loss)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );

  if (bare) return content;

  return (
    <Card hover={false} className="p-4 md:p-5">
      {content}
    </Card>
  );
}

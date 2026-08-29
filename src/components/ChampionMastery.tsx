import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { championIconUrl } from "@/lib/ddragon";
import { formatRelativeTime } from "@/lib/utils";
import type { ChampionMasteryDto } from "@/lib/riot/types";
import type { ChampionMap } from "@/types/domain";

interface ChampionMasteryProps {
  masteries: ChampionMasteryDto[];
  championMap: ChampionMap | null;
}

export default function ChampionMastery({ masteries, championMap }: ChampionMasteryProps) {
  if (!masteries || masteries.length === 0) return null;

  return (
    <Card hover={false} className="p-4 md:p-5">
      <div className="text-lg font-semibold text-text-primary">Champion Mastery</div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {masteries.map((m) => {
          const champ = championMap?.[m.championId];
          const icon = champ ? championIconUrl(champ.id) : null;

          return (
            <div
              key={m.championId}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border">
                {icon ? (
                  <img src={icon} alt={champ?.name || ""} className="h-full w-full object-cover" loading="lazy" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-text-primary">{champ?.name || "Unknown"}</div>
                <div className="text-xs text-text-secondary">
                  {m.championPoints.toLocaleString()} pts • {formatRelativeTime(m.lastPlayTime)}
                </div>
              </div>

              <Badge tone="accent" className="shrink-0">
                Lv {m.championLevel}
              </Badge>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

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
    <div>
      <div className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
        Champion Mastery
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {masteries.map((m) => {
          const champ = championMap?.[m.championId];
          const icon = champ ? championIconUrl(champ.id) : null;

          return (
            <div
              key={m.championId}
              className="relative overflow-hidden rounded-xl bg-surface"
              title={champ?.name ? `Last played ${formatRelativeTime(m.lastPlayTime)}` : undefined}
            >
              {icon ? (
                <img
                  src={icon}
                  alt={champ?.name || ""}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-square w-full" />
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-6">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-sm font-semibold text-white">{champ?.name || "Unknown"}</span>
                  <span className="shrink-0 font-mono text-[11px] font-medium text-white/80">
                    Lv {m.championLevel}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-white/70">{m.championPoints.toLocaleString()} pts</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

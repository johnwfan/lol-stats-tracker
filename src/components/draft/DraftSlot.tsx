import ChampionPicker from "@/components/draft/ChampionPicker";
import type { PickableChampion } from "@/lib/ml/championNames";

interface DraftSlotProps {
  roleLabel: string;
  side: "blue" | "red";
  champions: PickableChampion[];
  value: PickableChampion | null;
  onSelect: (champion: PickableChampion) => void;
  takenApiNames: Set<string>;
}

export default function DraftSlot({ roleLabel, side, champions, value, onSelect, takenApiNames }: DraftSlotProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide text-text-muted">{roleLabel}</span>
      <div className="flex-1">
        <ChampionPicker
          champions={champions}
          value={value}
          onSelect={onSelect}
          takenApiNames={takenApiNames}
          side={side}
          roleLabel={roleLabel}
        />
      </div>
    </div>
  );
}

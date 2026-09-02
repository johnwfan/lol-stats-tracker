import { cn } from "@/lib/utils";
import type { DraftAdvantage } from "@/lib/ml/types";

// Segment widths are the ACTUAL verified empirical shares of the reference
// distribution (see ml-service/verify_reference_distribution.py), not
// arbitrary equal fifths: Strong Red 6.68% | Slight Red 24.52% | Even
// 37.69% | Slight Blue 24.34% | Strong Blue 6.77%.
const SEGMENTS: { key: DraftAdvantage; label: string; widthPct: number; colorClass: string }[] = [
  { key: "strong_red", label: "Strong Red", widthPct: 6.68, colorClass: "bg-red-side" },
  { key: "slight_red", label: "Slight Red", widthPct: 24.52, colorClass: "bg-red-side/45" },
  { key: "even", label: "Even", widthPct: 37.69, colorClass: "bg-border-strong" },
  { key: "slight_blue", label: "Slight Blue", widthPct: 24.34, colorClass: "bg-blue-side/45" },
  { key: "strong_blue", label: "Strong Blue", widthPct: 6.77, colorClass: "bg-blue-side" },
];

interface DraftStrengthScaleProps {
  advantage: DraftAdvantage;
  /** 0-100, the model-score percentile already returned by the API -- used
   * directly as the marker position since it's already on the same scale
   * as these segment widths (both derived from the same reference distribution). */
  percentile: number;
}

export default function DraftStrengthScale({ advantage, percentile }: DraftStrengthScaleProps) {
  const clampedPercentile = Math.min(99, Math.max(1, percentile));

  return (
    <div>
      <div className="relative h-3 w-full overflow-hidden rounded-full border border-border">
        <div className="flex h-full w-full">
          {SEGMENTS.map((seg) => (
            <div
              key={seg.key}
              style={{ width: `${seg.widthPct}%` }}
              className={cn("h-full", seg.colorClass, seg.key === advantage && "ring-2 ring-inset ring-text-primary/30")}
            />
          ))}
        </div>
        <div
          aria-hidden
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-card bg-text-primary shadow-[0_1px_3px_var(--color-shadow)]"
          style={{ left: `${clampedPercentile}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-medium uppercase tracking-wide text-text-muted">
        <span>Strong Red</span>
        <span>Even</span>
        <span>Strong Blue</span>
      </div>
    </div>
  );
}

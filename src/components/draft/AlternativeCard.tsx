import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { championIconUrl } from "@/lib/ddragon";
import { ADVANTAGE_COPY, CONFIDENCE_COPY, ordinal } from "@/lib/ml/draftCopy";
import type { DraftAnalysis } from "@/lib/ml/types";
import type { PickableChampion } from "@/lib/ml/championNames";

export interface AlternativeComparison {
  id: string;
  champion: PickableChampion;
  status: "loading" | "success" | "error";
  analysis?: DraftAnalysis;
  errorMessage?: string;
}

interface AlternativeCardProps {
  comparison: AlternativeComparison;
  original: DraftAnalysis;
  onRemove: (id: string) => void;
}

export default function AlternativeCard({ comparison, original, onRemove }: AlternativeCardProps) {
  const { champion, status } = comparison;
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="relative rounded-xl border border-border bg-surface p-3"
    >
      <button
        type="button"
        onClick={() => onRemove(comparison.id)}
        aria-label={`Remove ${champion.name} from comparison`}
        className="absolute right-2 top-2 rounded-lg p-1 text-text-muted transition hover:bg-overlay-hover hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2.5 pr-6">
        <img
          src={championIconUrl(champion.apiName) ?? undefined}
          alt={champion.name}
          className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover"
          loading="lazy"
        />
        <span className="truncate text-sm font-semibold text-text-primary">{champion.name}</span>
      </div>

      {status === "loading" && (
        <div className="mt-3 flex items-center gap-2 text-xs text-text-muted">
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-border border-t-accent" aria-hidden />
          Analyzing this alternative...
        </div>
      )}

      {status === "error" && (
        <div className="mt-3 rounded-lg border border-coral/30 bg-coral-soft px-2.5 py-2 text-xs text-coral">
          {comparison.errorMessage ?? "Draft analysis is temporarily unavailable. Please try again."}
        </div>
      )}

      {status === "success" && comparison.analysis && (
        <AlternativeOutcome analysis={comparison.analysis} original={original} />
      )}
    </motion.div>
  );
}

function AlternativeOutcome({ analysis, original }: { analysis: DraftAnalysis; original: DraftAnalysis }) {
  const copy = ADVANTAGE_COPY[analysis.advantage];
  const originalCopy = ADVANTAGE_COPY[original.advantage];
  const confidenceCopy = CONFIDENCE_COPY[analysis.confidence];
  const advantageChanged = analysis.advantage !== original.advantage;

  const delta = Math.round(analysis.percentile) - Math.round(original.percentile);
  const deltaLabel =
    delta === 0 ? "No change" : delta > 0 ? `↑ ${delta} pt${delta === 1 ? "" : "s"}` : `↓ ${Math.abs(delta)} pt${Math.abs(delta) === 1 ? "" : "s"}`;

  return (
    <div className="mt-3 space-y-2">
      {advantageChanged ? (
        <div className="flex flex-wrap items-baseline gap-1.5 text-sm font-semibold">
          <span className="text-text-muted">{originalCopy.headline}</span>
          <span className="text-text-muted">&rarr;</span>
          <span className={copy.colorClass}>{copy.headline}</span>
        </div>
      ) : (
        <div className={cn("text-sm font-semibold", copy.colorClass)}>{copy.headline}</div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-text-secondary">{ordinal(analysis.percentile)} percentile</span>
        <span className="font-semibold text-text-primary">{deltaLabel}</span>
      </div>

      <div className="text-[11px] text-text-muted">Confidence: {confidenceCopy.label}</div>

      {analysis.confidence === "very_low" && (
        <div className="flex items-start gap-1.5 rounded-lg border border-coral/30 bg-coral-soft px-2 py-1.5 text-[11px] text-coral">
          <Badge tone="coral" className="shrink-0 px-2 py-0.5 text-[10px]">Note</Badge>
          <span>Very Low confidence &mdash; limited historical support for this champion in this role.</span>
        </div>
      )}
      {analysis.confidence !== "very_low" && analysis.warnings.length > 0 && (
        <div className="flex items-start gap-1.5 rounded-lg border border-coral/30 bg-coral-soft px-2 py-1.5 text-[11px] text-coral">
          <Badge tone="coral" className="shrink-0 px-2 py-0.5 text-[10px]">Note</Badge>
          <span>Limited historical data for this champion-role combination &mdash; treat this result with extra caution.</span>
        </div>
      )}
    </div>
  );
}

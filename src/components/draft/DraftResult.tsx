import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import DraftStrengthScale from "@/components/draft/DraftStrengthScale";
import { cn } from "@/lib/utils";
import { ADVANTAGE_COPY, CONFIDENCE_COPY, ordinal } from "@/lib/ml/draftCopy";
import type { DraftAnalysis } from "@/lib/ml/types";

interface DraftResultProps {
  analysis: DraftAnalysis;
  stale: boolean;
}

export default function DraftResult({ analysis, stale }: DraftResultProps) {
  const copy = ADVANTAGE_COPY[analysis.advantage];
  const confidenceCopy = CONFIDENCE_COPY[analysis.confidence];
  const isDev = process.env.NODE_ENV === "development";

  return (
    <Card hover={false} className={cn("p-5 md:p-6 transition-opacity", stale && "opacity-50")}>
      {stale && (
        <div className="mb-4 rounded-lg border border-gold/30 bg-gold-soft px-3 py-2 text-xs font-medium text-gold">
          Draft changed — click Analyze Draft again to update this result.
        </div>
      )}

      <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Draft Intelligence Result</div>
      <h2 className={cn("mt-1 text-2xl font-bold md:text-3xl", copy.colorClass)}>{copy.headline}</h2>
      <p className="mt-2 max-w-prose text-sm text-text-secondary">{copy.explanation}</p>

      <div className="mt-5">
        <DraftStrengthScale advantage={analysis.advantage} percentile={analysis.percentile} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="text-xs text-text-muted">Model draft score</div>
          <div className="mt-1 text-base font-semibold text-text-primary">{ordinal(analysis.percentile)} percentile</div>
          <div className="mt-1 text-xs text-text-muted">Relative to the model&apos;s historical reference-score distribution.</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="text-xs text-text-muted">Model confidence</div>
          <div className="mt-1 text-base font-semibold text-text-primary">{confidenceCopy.label}</div>
          <div className="mt-1 text-xs text-text-muted">{confidenceCopy.explanation}</div>
        </div>
      </div>

      {analysis.warnings.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-coral/30 bg-coral-soft px-3 py-2 text-xs text-coral">
          <Badge tone="coral" className="shrink-0">Note</Badge>
          <span>Limited historical data for one or more champion-role combinations in this draft — treat this result with extra caution.</span>
        </div>
      )}

      <div className="mt-5 border-t border-border pt-4 text-xs text-text-muted">
        <p>
          <span className="font-semibold text-text-secondary">Reference population: </span>
          {analysis.reference_population}
        </p>
        <p className="mt-1.5">{analysis.disclaimer}</p>
        <p className="mt-1.5 text-[11px] text-text-muted/80">Model version: {analysis.model_version}</p>
      </div>

      {isDev && (
        <details className="mt-4 rounded-lg border border-dashed border-border p-2 text-[11px] text-text-muted">
          <summary className="cursor-pointer select-none">Debug (dev only)</summary>
          <div className="mt-1.5 space-y-0.5 font-mono">
            <div>raw_score: {analysis.raw_score.toFixed(4)}</div>
            <div>z_score: {analysis.z_score.toFixed(4)}</div>
            <div>percentile: {analysis.percentile.toFixed(2)}</div>
          </div>
        </details>
      )}
    </Card>
  );
}

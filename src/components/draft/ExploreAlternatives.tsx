"use client";

import { useMemo } from "react";
import { FlaskConical, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ChampionPicker from "@/components/draft/ChampionPicker";
import AlternativeCard, { type AlternativeComparison } from "@/components/draft/AlternativeCard";
import { championIconUrl } from "@/lib/ddragon";
import { ordinal } from "@/lib/ml/draftCopy";
import { cn } from "@/lib/utils";
import type { DraftAnalysis, DraftRequest } from "@/lib/ml/types";
import type { PickableChampion } from "@/lib/ml/championNames";

export interface SlotOption {
  key: keyof DraftRequest;
  side: "blue" | "red";
  roleLabel: string;
  champion: PickableChampion;
}

const MAX_ALTERNATIVES = 6;

interface ExploreAlternativesProps {
  open: boolean;
  onToggleOpen: () => void;
  slotOptions: SlotOption[];
  exploreSlot: keyof DraftRequest | null;
  onSelectSlot: (slot: keyof DraftRequest) => void;
  champions: PickableChampion[];
  alternatives: AlternativeComparison[];
  onTestAlternative: (champion: PickableChampion) => void;
  onRemoveAlternative: (id: string) => void;
  originalAnalysis: DraftAnalysis;
}

export default function ExploreAlternatives({
  open,
  onToggleOpen,
  slotOptions,
  exploreSlot,
  onSelectSlot,
  champions,
  alternatives,
  onTestAlternative,
  onRemoveAlternative,
  originalAnalysis,
}: ExploreAlternativesProps) {
  const currentSlot = slotOptions.find((s) => s.key === exploreSlot) ?? null;

  const takenApiNames = useMemo(() => {
    const set = new Set<string>();
    for (const slot of slotOptions) {
      if (slot.key !== exploreSlot) set.add(slot.champion.apiName);
    }
    if (currentSlot) set.add(currentSlot.champion.apiName);
    for (const alt of alternatives) set.add(alt.champion.apiName);
    return set;
  }, [slotOptions, exploreSlot, currentSlot, alternatives]);

  if (!open) {
    return (
      <div>
        <Button variant="outline" size="sm" onClick={onToggleOpen}>
          <FlaskConical className="h-3.5 w-3.5" />
          Explore Alternatives
        </Button>
      </div>
    );
  }

  const hasInFlight = alternatives.some((a) => a.status === "loading");
  const atCap = alternatives.length >= MAX_ALTERNATIVES;
  const pickerDisabled = hasInFlight || atCap;
  const pickerValue = alternatives.length > 0 ? alternatives[alternatives.length - 1].champion : null;

  return (
    <Card hover={false} className="p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-text-muted">Explore Alternatives</h3>
          <p className="mt-1 max-w-prose text-xs text-text-secondary">
            See how the model&apos;s score changes if you swap one pick, holding the other nine fixed.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onToggleOpen} aria-label="Close Explore Alternatives">
          <X className="h-3.5 w-3.5" />
          Close
        </Button>
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Choose a slot to explore</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {slotOptions.map((slot) => {
            const active = slot.key === exploreSlot;
            return (
              <button
                key={slot.key}
                type="button"
                onClick={() => onSelectSlot(slot.key)}
                aria-pressed={active}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-accent/40",
                  active
                    ? slot.side === "blue"
                      ? "border-blue-side bg-blue-side-soft text-blue-side"
                      : "border-red-side bg-red-side-soft text-red-side"
                    : "border-border bg-surface text-text-secondary hover:border-border-strong"
                )}
              >
                {slot.side === "blue" ? "Blue" : "Red"} {slot.roleLabel} &mdash; {slot.champion.name}
              </button>
            );
          })}
        </div>
      </div>

      {currentSlot && (
        <>
          <div className="mt-5 rounded-xl border border-border bg-surface p-3">
            <div className="text-xs text-text-muted">
              Original &mdash; {currentSlot.side === "blue" ? "Blue" : "Red"} {currentSlot.roleLabel}
            </div>
            <div className="mt-1.5 flex items-center gap-2.5">
              <img
                src={championIconUrl(currentSlot.champion.apiName) ?? undefined}
                alt={currentSlot.champion.name}
                className="h-9 w-9 shrink-0 rounded-lg border border-border object-cover"
                loading="lazy"
              />
              <div>
                <div className="text-sm font-semibold text-text-primary">{currentSlot.champion.name}</div>
                <div className="text-xs text-text-muted">{ordinal(originalAnalysis.percentile)} percentile</div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <ChampionPicker
              champions={champions}
              value={pickerValue}
              onSelect={onTestAlternative}
              takenApiNames={takenApiNames}
              side={currentSlot.side}
              roleLabel={`${currentSlot.side === "blue" ? "Blue" : "Red"} ${currentSlot.roleLabel} alternative`}
              disabled={pickerDisabled}
            />
            {atCap && (
              <p className="mt-2 text-xs text-text-muted">
                Comparison limit reached ({MAX_ALTERNATIVES}) &mdash; remove one below to test another.
              </p>
            )}
          </div>

          {alternatives.length > 0 && (
            <div className="mt-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Compared alternatives</div>
              <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                {alternatives.map((alt) => (
                  <AlternativeCard key={alt.id} comparison={alt} original={originalAnalysis} onRemove={onRemoveAlternative} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

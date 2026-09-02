"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import DraftSlot from "@/components/draft/DraftSlot";
import DraftResult from "@/components/draft/DraftResult";
import ExploreAlternatives, { type SlotOption } from "@/components/draft/ExploreAlternatives";
import type { AlternativeComparison } from "@/components/draft/AlternativeCard";
import { loadPickableChampions, type PickableChampion } from "@/lib/ml/championNames";
import type { DraftAnalysis, DraftRequest } from "@/lib/ml/types";
import { RotateCcw, Swords } from "lucide-react";

const SLOTS: { key: keyof DraftRequest; side: "blue" | "red"; roleLabel: string }[] = [
  { key: "blue_top", side: "blue", roleLabel: "Top" },
  { key: "blue_jungle", side: "blue", roleLabel: "Jungle" },
  { key: "blue_mid", side: "blue", roleLabel: "Mid" },
  { key: "blue_adc", side: "blue", roleLabel: "ADC" },
  { key: "blue_support", side: "blue", roleLabel: "Support" },
  { key: "red_top", side: "red", roleLabel: "Top" },
  { key: "red_jungle", side: "red", roleLabel: "Jungle" },
  { key: "red_mid", side: "red", roleLabel: "Mid" },
  { key: "red_adc", side: "red", roleLabel: "ADC" },
  { key: "red_support", side: "red", roleLabel: "Support" },
];

type Selections = Partial<Record<keyof DraftRequest, PickableChampion>>;

export default function DraftPage() {
  const [champions, setChampions] = useState<PickableChampion[]>([]);
  const [championsError, setChampionsError] = useState<string | null>(null);
  const [selections, setSelections] = useState<Selections>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [result, setResult] = useState<DraftAnalysis | null>(null);
  const [resultSnapshot, setResultSnapshot] = useState<Selections | null>(null);

  const [exploring, setExploring] = useState(false);
  const [exploreSlot, setExploreSlot] = useState<keyof DraftRequest | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeComparison[]>([]);
  const nextAlternativeId = useRef(0);

  useEffect(() => {
    loadPickableChampions()
      .then(setChampions)
      .catch(() => setChampionsError("Couldn't load champion data. Please refresh the page."));
  }, []);

  const filledCount = Object.keys(selections).length;
  const isComplete = filledCount === 10;

  const takenApiNames = useMemo(() => new Set(Object.values(selections).map((c) => c.apiName)), [selections]);

  const isStale = result !== null && resultSnapshot !== null && !slotsEqual(selections, resultSnapshot);

  const slotOptions: SlotOption[] = useMemo(() => {
    if (!resultSnapshot) return [];
    return SLOTS.map((slot) => ({
      key: slot.key,
      side: slot.side,
      roleLabel: slot.roleLabel,
      champion: resultSnapshot[slot.key]!,
    }));
  }, [resultSnapshot]);

  function clearExploration() {
    setExploring(false);
    setExploreSlot(null);
    setAlternatives([]);
  }

  function handleSelect(key: keyof DraftRequest, champion: PickableChampion) {
    setSelections((prev) => ({ ...prev, [key]: champion }));
    // Editing the original draft invalidates any in-progress counterfactual exploration --
    // alternatives were built against the old baseline and no longer apply.
    if (exploring || exploreSlot || alternatives.length > 0) {
      clearExploration();
    }
  }

  function handleReset() {
    setSelections({});
    setResult(null);
    setResultSnapshot(null);
    setAnalyzeError(null);
    clearExploration();
  }

  async function handleAnalyze() {
    if (!isComplete) return;
    setAnalyzing(true);
    setAnalyzeError(null);

    const draft = buildDraftRequest(selections);

    try {
      const res = await fetch("/api/ml/analyze-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Draft analysis is temporarily unavailable. Please try again.");
      }
      setResult(body as DraftAnalysis);
      setResultSnapshot(selections);
    } catch {
      setAnalyzeError("Draft analysis is temporarily unavailable. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleToggleExplore() {
    setExploring((prev) => !prev);
  }

  function handleSelectExploreSlot(slot: keyof DraftRequest) {
    if (slot !== exploreSlot) {
      // Alternatives were tested for a different role -- don't mix roles in one list.
      setAlternatives([]);
    }
    setExploreSlot(slot);
  }

  async function handleTestAlternative(champion: PickableChampion) {
    if (!exploreSlot || !resultSnapshot) return;
    const slot = exploreSlot;
    nextAlternativeId.current += 1;
    const id = `alt-${nextAlternativeId.current}`;

    setAlternatives((prev) => [...prev, { id, champion, status: "loading" }]);

    const draft = buildDraftRequest({ ...resultSnapshot, [slot]: champion });

    try {
      const res = await fetch("/api/ml/analyze-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body?.error || "Draft analysis is temporarily unavailable. Please try again.");
      }
      const analysis = body as DraftAnalysis;
      setAlternatives((prev) => prev.map((a) => (a.id === id ? { ...a, status: "success", analysis } : a)));
    } catch {
      setAlternatives((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, status: "error", errorMessage: "Draft analysis is temporarily unavailable. Please try again." }
            : a
        )
      );
    }
  }

  function handleRemoveAlternative(id: string) {
    setAlternatives((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <main>
      <Navbar backHref="/" backLabel="Back to search" />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary md:text-3xl">
            <Swords className="h-6 w-6 text-accent" />
            Draft Intelligence
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Select all ten champions to see how this draft scores against a model trained on real historical ranked
            matches. This is an experimental research tool, not a win-probability predictor.
          </p>
        </div>

        {championsError && <ErrorBanner message={championsError} />}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card hover={false} className="p-4 md:p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-blue-side">Blue Team</h2>
            <div className="space-y-2.5">
              {SLOTS.filter((s) => s.side === "blue").map((slot) => (
                <DraftSlot
                  key={slot.key}
                  roleLabel={slot.roleLabel}
                  side={slot.side}
                  champions={champions}
                  value={selections[slot.key] ?? null}
                  onSelect={(champ) => handleSelect(slot.key, champ)}
                  takenApiNames={takenApiNames}
                />
              ))}
            </div>
          </Card>

          <Card hover={false} className="p-4 md:p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-red-side">Red Team</h2>
            <div className="space-y-2.5">
              {SLOTS.filter((s) => s.side === "red").map((slot) => (
                <DraftSlot
                  key={slot.key}
                  roleLabel={slot.roleLabel}
                  side={slot.side}
                  champions={champions}
                  value={selections[slot.key] ?? null}
                  onSelect={(champ) => handleSelect(slot.key, champ)}
                  takenApiNames={takenApiNames}
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="md" onClick={handleAnalyze} disabled={!isComplete || analyzing}>
            {analyzing ? "Analyzing..." : "Analyze Draft"}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          {!isComplete && <span className="text-sm text-text-muted">{filledCount} / 10 picks selected</span>}
        </div>

        {analyzeError && <ErrorBanner message={analyzeError} />}

        {result && <DraftResult analysis={result} stale={isStale} />}

        {result && !isStale && (
          <ExploreAlternatives
            open={exploring}
            onToggleOpen={handleToggleExplore}
            slotOptions={slotOptions}
            exploreSlot={exploreSlot}
            onSelectSlot={handleSelectExploreSlot}
            champions={champions}
            alternatives={alternatives}
            onTestAlternative={handleTestAlternative}
            onRemoveAlternative={handleRemoveAlternative}
            originalAnalysis={result}
          />
        )}
      </div>
    </main>
  );
}

function slotsEqual(a: Selections, b: Selections): boolean {
  const keys = Object.keys({ ...a, ...b }) as (keyof DraftRequest)[];
  return keys.every((k) => a[k]?.apiName === b[k]?.apiName);
}

/** Requires every slot in `picks` to be filled -- callers only pass complete selections. */
function buildDraftRequest(picks: Selections): DraftRequest {
  return Object.fromEntries(SLOTS.map(({ key }) => [key, picks[key]!.apiName])) as unknown as DraftRequest;
}

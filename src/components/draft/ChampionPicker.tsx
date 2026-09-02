"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import Input from "@/components/ui/Input";
import { championIconUrl } from "@/lib/ddragon";
import { cn } from "@/lib/utils";
import type { PickableChampion } from "@/lib/ml/championNames";

interface ChampionPickerProps {
  champions: PickableChampion[];
  value: PickableChampion | null;
  onSelect: (champion: PickableChampion) => void;
  /** apiName set of champions already picked in OTHER slots -- shown disabled here. */
  takenApiNames: Set<string>;
  side: "blue" | "red";
  roleLabel: string;
}

export default function ChampionPicker({ champions, value, onSelect, takenApiNames, side, roleLabel }: ChampionPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  function toggleOpen() {
    if (open) {
      setOpen(false);
      return;
    }
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left, width: Math.max(rect.width, 288) });
    }
    setQuery("");
    setOpen(true);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return champions;
    return champions.filter((c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
  }, [champions, query]);

  const accentClass = side === "blue" ? "focus:border-blue-side/50 focus:ring-blue-side/20" : "focus:border-red-side/50 focus:ring-red-side/20";

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        aria-label={value ? `${roleLabel}: ${value.name} selected, click to change` : `Select champion for ${roleLabel}`}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface p-2 text-left transition",
          "hover:border-border-strong focus:outline-none focus:ring-2",
          accentClass
        )}
      >
        {value ? (
          <>
            <img
              src={championIconUrl(value.apiName) ?? undefined}
              alt={value.name}
              className="h-10 w-10 shrink-0 rounded-lg border border-border object-cover"
              loading="lazy"
            />
            <span className="truncate text-sm font-semibold text-text-primary">{value.name}</span>
          </>
        ) : (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-border-strong text-text-muted">
              <Search className="h-4 w-4" />
            </span>
            <span className="truncate text-sm text-text-muted">Select champion</span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && coords ? (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width }}
            className="z-50 flex max-h-96 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[0_16px_40px_var(--color-shadow)]"
          >
            <div className="flex items-center gap-2 border-b border-border p-2">
              <Search className="ml-1 h-4 w-4 shrink-0 text-text-muted" />
              <Input
                ref={inputRef}
                bare
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search champion..."
                aria-label={`Search champions for ${roleLabel}`}
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close champion picker"
                className="mr-1 shrink-0 rounded-lg p-1 text-text-muted transition hover:bg-overlay-hover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5 overflow-y-auto p-2 sm:grid-cols-5">
              {filtered.length === 0 ? (
                <div className="col-span-full py-6 text-center text-sm text-text-muted">No champions match &quot;{query}&quot;</div>
              ) : (
                filtered.map((champ) => {
                  const taken = takenApiNames.has(champ.apiName) && champ.apiName !== value?.apiName;
                  return (
                    <button
                      key={champ.id}
                      type="button"
                      disabled={taken}
                      onClick={() => {
                        onSelect(champ);
                        setOpen(false);
                      }}
                      title={taken ? `${champ.name} is already in this draft` : champ.name}
                      aria-label={taken ? `${champ.name}, already selected elsewhere in this draft` : `Select ${champ.name}`}
                      className={cn(
                        "group flex flex-col items-center gap-1 rounded-lg p-1.5 transition",
                        taken ? "cursor-not-allowed opacity-30" : "hover:bg-overlay-hover focus:outline-none focus:ring-2 focus:ring-accent/40"
                      )}
                    >
                      <img
                        src={championIconUrl(champ.apiName) ?? undefined}
                        alt={champ.name}
                        loading="lazy"
                        className="aspect-square w-full rounded-lg border border-border object-cover"
                      />
                      <span className="w-full truncate text-center text-[11px] text-text-secondary">{champ.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

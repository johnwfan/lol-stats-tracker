"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import RecentSearches from "@/components/RecentSearches";
import { cn } from "@/lib/utils";
import type { RegionOption, RecentSearchItem } from "@/types/domain";

const REGIONS: RegionOption[] = [
  { label: "NA (na1)", value: "na1" },
  { label: "EUW (euw1)", value: "euw1" },
  { label: "EUNE (eun1)", value: "eun1" },
  { label: "KR (kr)", value: "kr" },
  { label: "JP (jp1)", value: "jp1" },
  { label: "BR (br1)", value: "br1" },
  { label: "LAN (la1)", value: "la1" },
  { label: "LAS (la2)", value: "la2" },
  { label: "OCE (oc1)", value: "oc1" },
  { label: "TR (tr1)", value: "tr1" },
  { label: "RU (ru)", value: "ru" },
];

export { REGIONS };

function getDefaultRegion(): string {
  if (typeof window === "undefined") return "na1";
  try {
    return window.localStorage.getItem("scuttle:defaultRegion") || "na1";
  } catch {
    return "na1";
  }
}

interface SearchFormProps {
  variant?: "default" | "poster";
}

export default function SearchForm({ variant = "default" }: SearchFormProps) {
  const isPoster = variant === "poster";
  const router = useRouter();
  const [platform, setPlatform] = useState(getDefaultRegion);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [recentOpen, setRecentOpen] = useState(false);
  const recentWrapRef = useRef<HTMLDivElement>(null);

  const regionLabel = useMemo(() => {
    return REGIONS.find((r) => r.value === platform)?.label || platform.toUpperCase();
  }, [platform]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!recentWrapRef.current) return;
      if (!recentWrapRef.current.contains(e.target as Node)) {
        setRecentOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function goToProfile(searchPlatform: string, searchName: string, searchTag: string) {
    router.push(
      `/${searchPlatform}/${encodeURIComponent(searchName.trim())}/${encodeURIComponent(searchTag.trim())}`
    );
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !tag.trim()) return;
    goToProfile(platform, name, tag);
  }

  function handlePick(item: RecentSearchItem) {
    setRecentOpen(false);
    setPlatform(item.platform);
    setName(item.name);
    setTag(item.tag);
    goToProfile(item.platform, item.name, item.tag);
  }

  return (
    <div className={cn(!isPoster && "glow-ring", recentOpen && "relative isolate z-50")}>
      <form onSubmit={handleSubmit}>
        {!isPoster ? (
          <div className="px-1 pb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Search by Riot ID <span className="normal-case text-text-muted/70">(name + tag)</span>
          </div>
        ) : null}

        <div ref={recentWrapRef} className="relative" onFocusCapture={() => setRecentOpen(true)}>
          <div
            className={cn(
              "flex flex-col overflow-hidden md:flex-row md:items-stretch",
              isPoster
                ? "rounded-2xl border border-hp-navy bg-hp-ink shadow-[0_12px_32px_rgba(0,4,58,0.16)] transition focus-within:border-hp-red/40 focus-within:ring-2 focus-within:ring-hp-red/30"
                : "rounded-2xl border border-border bg-card transition focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20"
            )}
          >
            <div
              className={cn(
                "border-b shrink-0 md:w-[150px] md:border-b-0 md:border-r",
                isPoster ? "border-hp-navy" : "border-border"
              )}
            >
              <label className="sr-only">Region</label>
              <Select
                bare
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                options={REGIONS}
                className={isPoster ? "py-4 pl-4 pr-2 text-[1rem] text-white" : undefined}
              />
            </div>

            <div
              className={cn(
                "min-w-0 flex-1 border-b md:border-b-0 md:border-r",
                isPoster ? "border-hp-navy" : "border-border"
              )}
            >
              <label className="sr-only">Riot Name</label>
              <Input
                bare
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Riot name"
                className={isPoster ? "py-4 px-4 text-[1rem] text-white placeholder:text-white/35" : undefined}
              />
            </div>

            <div
              className={cn(
                "border-b shrink-0 md:w-[100px] md:border-b-0 md:border-r",
                isPoster ? "border-hp-navy" : "border-border"
              )}
            >
              <label className="sr-only">Tag</label>
              <Input
                bare
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Tag"
                className={isPoster ? "py-4 px-4 text-[1rem] text-white placeholder:text-white/35" : undefined}
              />
            </div>

            <Button
              type="submit"
              className={cn(
                "shrink-0 rounded-none px-6 py-2",
                isPoster && "bg-hp-red font-semibold text-white hover:bg-hp-red-deep"
              )}
            >
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>

          <div className="absolute left-0 right-0 top-full mt-2 z-[9999]">
            <AnimatePresence>
              {recentOpen ? <RecentSearches onPick={handlePick} /> : null}
            </AnimatePresence>
          </div>
        </div>

        {!isPoster ? (
          <div className="px-1 pt-2 text-xs text-text-muted">
            Region: <span className="text-text-secondary">{regionLabel}</span>
          </div>
        ) : null}
      </form>
    </div>
  );
}

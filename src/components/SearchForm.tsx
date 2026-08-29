"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import Card from "@/components/ui/Card";
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

export default function SearchForm() {
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
    <div className={cn("glow-ring", recentOpen && "relative isolate z-50")}>
      <Card hover={false} className="p-3 md:p-4">
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="text-sm text-text-secondary">
            Search by Riot ID <span className="text-text-muted">(name + tag)</span>
          </div>

          <div ref={recentWrapRef} className="relative" onFocusCapture={() => setRecentOpen(true)}>
            <div
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface md:flex-row md:items-stretch",
                "focus-within:border-accent/50 focus-within:ring-2 focus-within:ring-accent/20"
              )}
            >
              <div className="border-b border-border shrink-0 md:w-[150px] md:border-b-0 md:border-r">
                <label className="sr-only">Region</label>
                <Select bare value={platform} onChange={(e) => setPlatform(e.target.value)} options={REGIONS} />
              </div>

              <div className="min-w-0 flex-1 border-b border-border md:border-b-0 md:border-r">
                <label className="sr-only">Riot Name</label>
                <Input bare value={name} onChange={(e) => setName(e.target.value)} placeholder="Riot name" />
              </div>

              <div className="border-b border-border shrink-0 md:w-[110px] md:border-b-0 md:border-r">
                <label className="sr-only">Tag</label>
                <Input bare value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag" />
              </div>

              <Button type="submit" className="shrink-0 rounded-none py-2 md:px-6">
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

          <div className="text-xs text-text-muted">
            Region: <span className="text-text-secondary">{regionLabel}</span>
          </div>
        </form>
      </Card>
    </div>
  );
}

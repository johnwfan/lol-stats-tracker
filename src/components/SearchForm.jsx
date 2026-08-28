"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Search } from "lucide-react";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import ErrorBanner from "@/components/ui/ErrorBanner";
import RecentSearches from "@/components/RecentSearches";
import { cn } from "@/lib/utils";

const REGIONS = [
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

export default function SearchForm({
  platform,
  name,
  tag,
  onPlatformChange,
  onNameChange,
  onTagChange,
  onSubmit,
  loading,
  error,
  regionLabel,
  onRecentPick,
}) {
  const [recentOpen, setRecentOpen] = useState(false);
  const recentWrapRef = useRef(null);

  useEffect(() => {
    function onMouseDown(e) {
      if (!recentWrapRef.current) return;
      if (!recentWrapRef.current.contains(e.target)) {
        setRecentOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handlePick(item) {
    setRecentOpen(false);
    onRecentPick(item);
  }

  return (
    <Card hover={false} className={cn("p-4 md:p-5 relative isolate", recentOpen && "z-50")}>
      <form onSubmit={onSubmit} className="space-y-3">
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
              <Select
                bare
                value={platform}
                onChange={(e) => onPlatformChange(e.target.value)}
                options={REGIONS}
              />
            </div>

            <div className="min-w-0 flex-1 border-b border-border md:border-b-0 md:border-r">
              <label className="sr-only">Riot Name</label>
              <Input
                bare
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Riot name"
              />
            </div>

            <div className="border-b border-border shrink-0 md:w-[110px] md:border-b-0 md:border-r">
              <label className="sr-only">Tag</label>
              <Input
                bare
                value={tag}
                onChange={(e) => onTagChange(e.target.value)}
                placeholder="Tag"
              />
            </div>

            <Button type="submit" disabled={loading} className="shrink-0 rounded-none md:px-6">
              <Search className="h-4 w-4" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          <div className="absolute left-0 right-0 top-full mt-2 z-[9999]">
            <AnimatePresence>
              {recentOpen ? <RecentSearches onPick={handlePick} /> : null}
            </AnimatePresence>
          </div>
        </div>

        <ErrorBanner message={error} />

        <div className="text-xs text-text-muted">
          Region: <span className="text-text-secondary">{regionLabel}</span>
        </div>
      </form>
    </Card>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { RecentSearchItem } from "@/types/domain";

interface ExampleSearch {
  platform: string;
  name: string;
  tag: string;
}

const EXAMPLE_SEARCHES: ExampleSearch[] = [
  { platform: "na1", name: "Ablazeolive", tag: "NA1" },
  { platform: "na1", name: "Davemon", tag: "NA1" },
  { platform: "na1", name: "Will", tag: "NA12" },
];

export default function SearchChips() {
  const router = useRouter();
  const { data: session } = useSession();
  const [items, setItems] = useState<RecentSearchItem[]>([]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const res = await fetch("/api/recent-searches");
        const text = await res.text();
        const data = JSON.parse(text);
        if (res.ok) setItems(data.items || []);
      } catch {
        // ignore — search suggestions are non-critical
      }
    })();
  }, [session]);

  const hasHistory = !!session && items.length > 0;
  const list: (RecentSearchItem | ExampleSearch)[] = hasHistory ? items : EXAMPLE_SEARCHES;
  const key = (it: RecentSearchItem | ExampleSearch): string =>
    "_id" in it ? it._id : `${it.platform}-${it.name}-${it.tag}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-hp-ink/45">
        {hasHistory ? "Jump back in" : "Try a wandering summoner"}
      </span>
      {list.map((it) => (
        <button
          key={key(it)}
          type="button"
          onClick={() =>
            router.push(`/${it.platform}/${encodeURIComponent(it.name)}/${encodeURIComponent(it.tag)}`)
          }
          className="group inline-flex items-center gap-1 rounded-full border border-hp-border bg-white px-3 py-1.5 text-sm text-hp-ink/80 shadow-sm transition hover:border-hp-red/30 hover:text-hp-ink"
        >
          {it.name}#{it.tag}
          <span className="transition group-hover:translate-x-0.5">↗</span>
        </button>
      ))}
    </div>
  );
}

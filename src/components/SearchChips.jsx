"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Clock, Sparkles } from "lucide-react";

const EXAMPLE_SEARCHES = [
  { platform: "na1", name: "Doublelift", tag: "NA1" },
  { platform: "kr", name: "Hide on bush", tag: "KR1" },
  { platform: "euw1", name: "Caps", tag: "EUW" },
];

export default function SearchChips({ onPick }) {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);

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

  const hasHistory = session && items.length > 0;
  const list = hasHistory ? items : EXAMPLE_SEARCHES;
  const Icon = hasHistory ? Clock : Sparkles;
  const key = hasHistory ? (it) => it._id : (it) => `${it.platform}-${it.name}-${it.tag}`;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
      <span className="text-xs text-text-muted">{hasHistory ? "Jump back in:" : "Try an example:"}</span>
      {list.map((it) => (
        <button
          key={key(it)}
          type="button"
          onClick={() => onPick(it)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-text-secondary transition hover:border-accent/40 hover:bg-overlay-hover hover:text-text-primary"
        >
          <Icon className="h-3 w-3" />
          {it.name}#{it.tag}
        </button>
      ))}
    </div>
  );
}

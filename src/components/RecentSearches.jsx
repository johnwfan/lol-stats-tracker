"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function RecentSearches({ onPick }) {
  const { data: session } = useSession();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!session) return;
    (async () => {
      const res = await fetch("/api/recent-searches");
      const data = await res.json();
      setItems(data.items || []);
    })();
  }, [session]);

  if (!session || items.length === 0) return null;

  return (
    <div className="z-[9999] rounded-2xl border border-white/10 bg-black/70 backdrop-blur p-2 shadow-xl">
      <div className="px-2 py-1 text-xs text-white/60">recent searches</div>

      <div className="flex flex-col">
        {items.map((it) => (
          <button
            key={it._id}
            type="button"
            onClick={() => onPick(it)}
            className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-white/10"
          >
            <span className="text-white">{it.name}#{it.tag}</span>
            <span className="text-white/50"> · {it.platform.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

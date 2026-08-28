"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

export default function RecentSearches({ onPick }) {
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
        // ignore — recent searches are non-critical
      }
    })();
  }, [session]);

  if (!session || items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="z-[9999] rounded-2xl border border-border-strong bg-surface/95 backdrop-blur p-2 shadow-xl"
    >
      <div className="px-2 py-1 text-xs text-text-muted">recent searches</div>

      <div className="flex flex-col">
        {items.map((it) => (
          <button
            key={it._id}
            type="button"
            onClick={() => onPick(it)}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-overlay-hover"
          >
            <Clock className="h-3.5 w-3.5 shrink-0 text-text-muted" />
            <span className="text-text-primary">
              {it.name}#{it.tag}
            </span>
            <span className="text-text-secondary"> · {it.platform.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

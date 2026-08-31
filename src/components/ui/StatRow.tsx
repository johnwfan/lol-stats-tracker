import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatRowItem {
  label: string;
  value: ReactNode;
}

interface StatRowProps {
  items: StatRowItem[];
  className?: string;
}

export default function StatRow({ items, className }: StatRowProps) {
  return (
    <div className={cn("flex", className)}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn("flex-1 px-3 first:pl-0 last:pr-0", i > 0 && "border-l border-border")}
        >
          <div className="text-[11px] uppercase tracking-wide text-text-muted">{item.label}</div>
          <div className="mt-0.5 text-base font-semibold text-text-primary">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

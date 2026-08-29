import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatTileProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export default function StatTile({ label, value, className }: StatTileProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface p-3", className)}>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 text-base font-semibold text-text-primary">{value}</div>
    </div>
  );
}

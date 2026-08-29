import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(epochMs: number | null | undefined): string {
  if (!epochMs) return "—";
  const diffSec = Math.round((Date.now() - epochMs) / 1000);
  if (diffSec < 60) return "just now";

  const units: [string, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];

  for (const [label, secs] of units) {
    const value = Math.floor(diffSec / secs);
    if (value >= 1) return `${value} ${label}${value > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

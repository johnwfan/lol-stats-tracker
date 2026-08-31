import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TONES = {
  default: "border-border bg-surface text-text-secondary",
  accent: "border-accent/20 bg-accent/10 text-accent",
  win: "border-win/20 bg-win-soft text-win",
  loss: "border-loss/20 bg-loss-soft text-loss",
  gold: "border-gold/20 bg-gold-soft text-gold",
  periwinkle: "border-periwinkle/20 bg-periwinkle-soft text-periwinkle",
  coral: "border-coral/20 bg-coral-soft text-coral",
} as const;

interface BadgeProps {
  children: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
}

export default function Badge({ children, tone = "default", className }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        TONES[tone] || TONES.default,
        className
      )}
    >
      {children}
    </div>
  );
}

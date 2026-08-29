import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  bare?: boolean;
}

export default function Input({ className, bare, ...rest }: InputProps) {
  return (
    <input
      className={cn(
        bare
          ? "w-full bg-transparent px-3 py-2 text-text-primary placeholder:text-text-muted outline-none"
          : cn(
              "w-full rounded-xl border border-border bg-surface px-3 py-3",
              "text-text-primary placeholder:text-text-muted outline-none",
              "focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            ),
        className
      )}
      {...rest}
    />
  );
}

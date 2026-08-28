import { cn } from "@/lib/utils";

export default function Select({ options, className, bare, ...rest }) {
  return (
    <select
      className={cn(
        bare
          ? "w-full bg-transparent px-3 py-3 text-text-primary outline-none"
          : cn(
              "w-full rounded-xl border border-border bg-surface px-3 py-3",
              "text-text-primary outline-none",
              "focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            ),
        className
      )}
      {...rest}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

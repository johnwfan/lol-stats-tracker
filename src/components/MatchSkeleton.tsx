import { cn } from "@/lib/utils";

function Block({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface", className)} />;
}

function TeamBlock() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="px-4 py-2.5">
        <Block className="h-4 w-32" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
            <Block className="h-10 w-10 shrink-0 rounded-lg" />
            <Block className="h-4 flex-1" />
            <Block className="h-4 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MatchSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Block className="h-3 w-24" />
        <Block className="mt-2 h-8 w-56" />
      </div>
      <div className="grid gap-6">
        <TeamBlock />
        <TeamBlock />
      </div>
    </div>
  );
}

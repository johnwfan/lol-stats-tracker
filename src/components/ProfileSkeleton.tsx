import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function Block({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface", className)} />;
}

export default function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Profile header */}
      <Card hover={false} className="p-5 md:p-6">
        <div className="flex items-center gap-4">
          <Block className="h-20 w-20 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Block className="h-6 w-48" />
            <Block className="h-4 w-32" />
          </div>
          <Block className="h-6 w-28 shrink-0 rounded-full" />
        </div>
      </Card>

      {/* Ranked */}
      <Card hover={false} className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <Block className="h-5 w-20" />
          <Block className="h-4 w-16" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Block className="h-32 rounded-2xl" />
          <Block className="h-32 rounded-2xl" />
        </div>
      </Card>

      {/* Champion mastery */}
      <Card hover={false} className="p-4 md:p-5">
        <Block className="h-5 w-40" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Block key={i} className="h-16" />
          ))}
        </div>
      </Card>

      {/* Performance summary */}
      <Card hover={false} className="p-4 md:p-5">
        <Block className="h-5 w-32" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Block className="h-14" />
          <Block className="h-14" />
          <Block className="h-14" />
        </div>
      </Card>

      {/* KDA trend */}
      <Card hover={false} className="p-4 md:p-5">
        <Block className="mb-3 h-5 w-28" />
        <Block className="h-[180px]" />
      </Card>

      {/* Recent matches */}
      <Card hover={false} className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <Block className="h-5 w-32" />
          <Block className="h-4 w-14" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Block key={i} className="h-16" />
          ))}
        </div>
      </Card>
    </div>
  );
}

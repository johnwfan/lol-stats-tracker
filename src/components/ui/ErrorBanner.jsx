import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ErrorBanner({ message, className }) {
  if (!message) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error",
        className
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

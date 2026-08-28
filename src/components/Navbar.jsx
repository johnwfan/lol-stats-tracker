import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import Button from "@/components/ui/Button";

export default function Navbar({ backHref, backLabel = "Back" }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/70 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 py-3.5">
        <div className="relative flex items-center justify-center">
          <Link href="/" className="flex items-center gap-1 text-2xl md:text-3xl font-bold tracking-tight">
            <span className="text-text-primary">Scuttle</span>
            <span className="text-accent">.</span>
          </Link>

          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2">
            <Button href="/settings" variant="ghost" size="sm" aria-label="Settings" className="px-2.5">
              <Settings className="h-4 w-4" />
            </Button>
            <AuthButton />
          </div>
        </div>

        {backHref ? (
          <div className="mt-3">
            <Button href={backHref} variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

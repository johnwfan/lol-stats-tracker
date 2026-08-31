import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import Button from "@/components/ui/Button";

interface NavbarProps {
  backHref?: string;
  backLabel?: string;
}

export default function Navbar({ backHref, backLabel = "Back" }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          {backHref ? (
            <Button href={backHref} variant="ghost" size="sm" aria-label={backLabel} title={backLabel} className="px-2.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          ) : null}

          <Link href="/" className="flex items-center gap-1.5 text-xl font-bold tracking-tight text-text-primary md:text-2xl">
            <span className="font-display">scuttle.gg</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button
            href="/settings"
            variant="ghost"
            size="sm"
            aria-label="Settings"
            className="border-border-strong px-2.5"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <AuthButton />
        </div>
      </div>
    </header>
  );
}

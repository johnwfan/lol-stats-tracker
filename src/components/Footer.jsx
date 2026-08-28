import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1 text-lg font-bold tracking-tight">
            <span className="text-text-primary">Scuttle</span>
            <span className="text-accent">.</span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Fast League of Legends stats, ranked progress, and match history.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <Link href="/settings" className="hover:text-text-primary transition">
            Settings
          </Link>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center text-[11px] leading-relaxed text-text-muted">
          <p>
            Scuttle isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot
            Games or anyone officially involved in producing or managing League of Legends. League of
            Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.
          </p>
          <p className="mt-1">© {new Date().getFullYear()} Scuttle. Built for fun.</p>
        </div>
      </div>
    </footer>
  );
}

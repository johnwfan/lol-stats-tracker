"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { Settings, LogIn, LogOut } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

export default function HomeNav() {
  const { data: session, status } = useSession();
  const displayName = session?.user?.name || session?.user?.email || undefined;

  return (
    <header className="sticky top-0 z-20 border-b border-hp-border bg-hp-bg">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 md:px-6">
        <Link href="/" className="font-display text-2xl tracking-wide text-hp-ink">
          scuttle.gg
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full text-hp-ink/50 transition hover:bg-hp-ink/5 hover:text-hp-ink"
          >
            <Settings className="h-4 w-4" />
          </Link>

          {status === "loading" ? null : session ? (
            <div className="flex items-center gap-1.5">
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-full border border-hp-border py-1 pl-1 pr-3 text-hp-ink transition hover:bg-hp-ink/5"
              >
                <Avatar src={session.user?.image} name={displayName} size="sm" className="bg-hp-red/15 text-hp-red" />
                <span className="hidden text-xs font-medium sm:inline">{displayName}</span>
              </Link>
              <button
                type="button"
                onClick={() => signOut()}
                aria-label="Sign out"
                className="flex h-9 w-9 items-center justify-center rounded-full text-hp-ink/50 transition hover:bg-hp-ink/5 hover:text-hp-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => signIn("github")}
              className="inline-flex items-center gap-1.5 rounded-md bg-hp-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-hp-red-deep"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

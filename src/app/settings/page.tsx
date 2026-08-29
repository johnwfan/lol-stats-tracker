"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { User, Palette, Check, LogIn, LogOut } from "lucide-react";
import Navbar from "@/components/Navbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Avatar from "@/components/ui/Avatar";
import { REGIONS } from "@/components/SearchForm";
import { cn } from "@/lib/utils";

interface AccentSwatch {
  label: string;
  color: string;
  active: boolean;
}

const ACCENT_SWATCHES: AccentSwatch[] = [
  { label: "Sky (active)", color: "var(--color-accent)", active: true },
  { label: "Blue — coming soon", color: "#3b82f6", active: false },
  { label: "Violet — coming soon", color: "#8b5cf6", active: false },
  { label: "Emerald — coming soon", color: "#22c55e", active: false },
];

const INTENSITY_OPTIONS = ["Low", "Normal", "High"] as const;

function getDefaultRegion(): string {
  if (typeof window === "undefined") return "na1";
  try {
    return window.localStorage.getItem("scuttle:defaultRegion") || "na1";
  } catch {
    return "na1";
  }
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [defaultRegion, setDefaultRegion] = useState(getDefaultRegion);
  const [intensity, setIntensity] = useState<(typeof INTENSITY_OPTIONS)[number]>("Normal");

  function handleRegionChange(value: string) {
    setDefaultRegion(value);
    try {
      window.localStorage.setItem("scuttle:defaultRegion", value);
    } catch {
      // localStorage unavailable — setting just won't persist
    }
  }

  return (
    <main>
      <Navbar backHref="/" backLabel="Back to search" />

      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">Manage your account and appearance preferences.</p>
        </div>

        {/* Account */}
        <Card hover={false} className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <User className="h-4 w-4 text-accent" />
            Account
          </div>

          {status === "loading" ? null : session ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar src={session.user?.image} name={session.user?.name || session.user?.email} size="lg" />
                <div className="min-w-0">
                  <div className="truncate font-semibold text-text-primary">
                    {session.user?.name || "Signed in"}
                  </div>
                  <div className="truncate text-sm text-text-secondary">{session.user?.email}</div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">Default region</div>
                    <div className="text-xs text-text-muted">Used to pre-fill the search bar.</div>
                  </div>
                  <div className="sm:w-[180px]">
                    <Select
                      value={defaultRegion}
                      onChange={(e) => handleRegionChange(e.target.value)}
                      options={REGIONS}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <Button variant="ghost" size="sm" onClick={() => signOut()}>
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">Sign in to see your account details.</p>
              <Button variant="outline" size="sm" onClick={() => signIn("github")}>
                <LogIn className="h-3.5 w-3.5" />
                Sign in with GitHub
              </Button>
            </div>
          )}
        </Card>

        {/* Appearance */}
        <Card hover={false} className="space-y-5 p-5">
          <div className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Palette className="h-4 w-4 text-accent" />
            Appearance
          </div>

          <div>
            <div className="text-sm font-medium text-text-primary">Accent color</div>
            <div className="mt-3 flex items-center gap-3">
              {ACCENT_SWATCHES.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  disabled={!s.active}
                  title={s.active ? "Active" : "Coming soon"}
                  aria-label={s.label}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-border-strong transition",
                    s.active ? "cursor-default" : "cursor-not-allowed opacity-40"
                  )}
                  style={{ backgroundColor: s.color }}
                >
                  {s.active ? <Check className="h-4 w-4 text-white" /> : null}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">More themes coming soon.</p>
          </div>

          <div>
            <div className="text-sm font-medium text-text-primary">Background intensity</div>
            <div className="mt-3 inline-flex rounded-full border border-border bg-surface p-1">
              {INTENSITY_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIntensity(opt)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition",
                    intensity === opt ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-muted">Preview only for now — full theming is on the way.</p>
          </div>
        </Card>
      </div>
    </main>
  );
}

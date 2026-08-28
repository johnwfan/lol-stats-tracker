"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { LogIn, LogOut } from "lucide-react";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <Button variant="outline" size="sm" onClick={() => signIn("github")}>
        <LogIn className="h-3.5 w-3.5" />
        Sign in
      </Button>
    );
  }

  const displayName = session.user?.name || session.user?.email;

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/settings"
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 transition hover:bg-overlay-hover"
      >
        <Avatar src={session.user?.image} name={displayName} size="sm" />
        <span className="hidden text-xs text-text-secondary sm:inline">{displayName}</span>
      </Link>
      <Button variant="ghost" size="sm" onClick={() => signOut()} aria-label="Sign out" className="px-2.5">
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

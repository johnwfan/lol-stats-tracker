"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <button
        onClick={() => signIn("github")}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
      >
        sign in
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-white/70">{session.user?.email}</span>
      <button
        onClick={() => signOut()}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
      >
        sign out
      </button>
    </div>
  );
}

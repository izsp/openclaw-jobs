"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useBalance } from "@/lib/hooks/use-balance";

export function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { balance } = useBalance(isAuthenticated);

  return (
    <nav className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6 sm:py-4">
      <Link href="/" className="text-lg font-bold tracking-tight">
        OpenClaw<span className="text-orange-500">.jobs</span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/worker"
          className="hidden text-sm text-zinc-500 transition-colors hover:text-zinc-300 sm:block"
        >
          For Workers
        </Link>

        {isAuthenticated && (
          <Link
            href="/chat"
            className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            Chat
          </Link>
        )}

        {isAuthenticated && balance && (
          <Link
            href="/dashboard"
            className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-orange-500 transition-colors hover:border-orange-500"
            title={`$${(balance.amount_cents / 100).toFixed(2)} USD`}
          >
            {balance.amount_cents}🦐
          </Link>
        )}

        {isAuthenticated ? (
          <UserMenu name={session.user?.name ?? "User"} />
        ) : (
          <button
            onClick={() => signIn()}
            className="rounded-full border border-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:border-orange-500 hover:text-orange-500 sm:px-4"
          >
            Sign in
          </button>
        )}
      </div>
    </nav>
  );
}

function UserMenu({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard"
        className="text-sm text-zinc-400 transition-colors hover:text-zinc-200"
      >
        Dashboard
      </Link>
      <button
        onClick={() => signOut()}
        className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        title={`Signed in as ${name}`}
      >
        Sign out
      </button>
    </div>
  );
}

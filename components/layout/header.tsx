"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useBalance } from "@/lib/hooks/use-balance";

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated";
  const { balance } = useBalance(isAuthenticated);

  const onDashboard = pathname === "/dashboard";
  const onChat = pathname === "/chat";

  return (
    <nav className="flex items-center justify-between border-b border-edge px-4 py-3 sm:px-6 sm:py-4">
      <Link href="/" className="text-lg font-bold tracking-tight text-content">
        OpenClaw<span className="text-accent">.jobs</span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        {isAuthenticated && !onChat && (
          <Link
            href="/chat"
            className="text-sm text-content-secondary transition-colors hover:text-content"
          >
            Chat
          </Link>
        )}

        {isAuthenticated && !onDashboard && (
          <Link
            href="/dashboard"
            className="text-sm text-content-secondary transition-colors hover:text-content"
          >
            Dashboard
          </Link>
        )}

        {isAuthenticated && balance && (
          <Link
            href="/dashboard"
            className="rounded-full border border-edge px-3 py-1 text-sm text-content-secondary transition-colors hover:border-edge-strong"
            title={`$${(balance.amount_cents / 100).toFixed(2)} USD`}
          >
            {balance.amount_cents} 🦐
          </Link>
        )}

        {isAuthenticated ? (
          <UserDropdown
            email={session.user?.email ?? ""}
            name={session.user?.name ?? ""}
          />
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-content px-4 py-1.5 text-sm font-medium text-page transition-opacity hover:opacity-90"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

function UserDropdown({ email, name }: { email: string; name: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const display = name || email.split("@")[0] || "User";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-sm text-content-secondary transition-colors hover:border-edge-strong"
      >
        <span className="max-w-[120px] truncate">{display}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-edge bg-elevated py-1 shadow-lg">
          {email && (
            <div className="border-b border-edge px-3 py-2 text-xs text-content-tertiary truncate">
              {email}
            </div>
          )}
          <button
            onClick={() => { setOpen(false); signOut(); }}
            className="w-full px-3 py-2 text-left text-sm text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

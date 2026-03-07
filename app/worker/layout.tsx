"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { getWorkerToken, clearWorkerCredentials } from "@/lib/api/worker-client";
import { TokenGate } from "@/components/worker/token-gate";
import { WorkerSidebar } from "@/components/worker/sidebar";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authenticated, setAuthenticated] = useState(() => !!getWorkerToken());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = useCallback(() => {
    clearWorkerCredentials();
    setAuthenticated(false);
  }, []);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
        <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            OpenClaw<span className="text-orange-500">.jobs</span>
            <span className="ml-2 text-xs text-zinc-500">Worker</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            For Buyers
          </Link>
        </nav>
        <main className="flex flex-1 items-center justify-center px-6 py-8">
          <TokenGate onAuthenticated={() => setAuthenticated(true)} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <div className="flex items-center">
        {/* Hamburger for mobile */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-4 text-zinc-400 hover:text-zinc-200 md:hidden"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <nav className="flex flex-1 items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            OpenClaw<span className="text-orange-500">.jobs</span>
            <span className="ml-2 text-xs text-zinc-500">Worker</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              For Buyers
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Disconnect
            </button>
          </div>
        </nav>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <WorkerSidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 md:hidden">
              <WorkerSidebar onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

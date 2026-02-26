/**
 * Worker dashboard page.
 * Token-gated: workers authenticate via Bearer token, not OAuth.
 */
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { TokenGate } from "@/components/worker/token-gate";
import { WorkerDashboardContent } from "@/components/worker/dashboard-content";
import { getWorkerToken, clearWorkerCredentials } from "@/lib/api/worker-client";

export default function WorkerPage() {
  const [authenticated, setAuthenticated] = useState(() => !!getWorkerToken());

  const handleLogout = useCallback(() => {
    clearWorkerCredentials();
    setAuthenticated(false);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <nav className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          OpenClaw<span className="text-orange-500">.jobs</span>
          <span className="ml-2 text-xs text-zinc-500">Worker</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            For Buyers
          </Link>
          {authenticated && (
            <button
              onClick={handleLogout}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Disconnect
            </button>
          )}
        </div>
      </nav>

      <main className="flex flex-1 flex-col items-center px-6 py-8">
        {authenticated ? (
          <WorkerDashboardContent />
        ) : (
          <div className="flex flex-1 items-center">
            <TokenGate onAuthenticated={() => setAuthenticated(true)} />
          </div>
        )}
      </main>
    </div>
  );
}

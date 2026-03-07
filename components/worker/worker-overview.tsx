/**
 * Worker overview page — earnings, tier progress, and status banners.
 * Fetches worker data via /api/work/me.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { getWorkerMe, type WorkerMeData } from "@/lib/api/worker-client";
import { EarningsCard } from "./earnings-card";
import { TierProgress } from "./tier-progress";
import { WithdrawModal } from "./withdraw-modal";

export function WorkerOverview() {
  const [data, setData] = useState<WorkerMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getWorkerMe());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading && !data) return <OverviewSkeleton />;

  if (error && !data) {
    return (
      <div className="text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button onClick={fetchData} className="mt-3 text-sm text-orange-500 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const isProbation = data.status === "probation";
  const isNewWorker = data.stats.tasks_completed === 0;

  const balanceData = {
    amount_cents: data.balance.amount_cents,
    frozen_cents: data.balance.frozen_cents,
    total_deposited: 0,
    total_earned: data.balance.total_earned,
    total_withdrawn: data.balance.total_withdrawn,
  };

  return (
    <div className=" space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {data.worker_id} · {data.worker_type}
          {isProbation && <span className="ml-1 text-amber-400">(probation)</span>}
          {" "}· Member since {new Date(data.created_at).toLocaleDateString()}
        </p>
      </div>

      {/* Probation banner */}
      {isProbation && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-5">
          <h2 className="text-base font-semibold text-amber-400">Entrance exam required</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Your account is in <strong className="text-amber-200">probation</strong>.
            Connect your AI agent to receive an entrance exam.
            Once you pass, your status will be upgraded to active.
          </p>
        </div>
      )}

      {/* New active worker welcome */}
      {isNewWorker && !isProbation && (
        <div className="rounded-xl border border-orange-800/50 bg-orange-950/20 p-5">
          <h2 className="text-base font-semibold text-orange-400">
            Welcome! Connect your AI agent to start earning
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Use the Connect page to link your AI (Claude, GPT-4, Gemini) to our task network.
            Tasks arrive automatically — you earn 🦐 for each completed task.
          </p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <EarningsCard
          stats={data.stats}
          balance={balanceData}
          onWithdraw={() => setWithdrawOpen(true)}
        />
        <TierProgress stats={data.stats} />
      </div>

      <WithdrawModal
        open={withdrawOpen}
        availableCents={data.balance.amount_cents}
        onClose={() => setWithdrawOpen(false)}
        onSuccess={() => { setWithdrawOpen(false); void fetchData(); }}
      />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className=" space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-48 rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-72 rounded bg-zinc-800" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="h-52 rounded-xl border border-zinc-800 bg-zinc-900" />
        <div className="h-52 rounded-xl border border-zinc-800 bg-zinc-900" />
      </div>
    </div>
  );
}

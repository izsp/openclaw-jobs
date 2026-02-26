/**
 * Displays worker earnings overview: today, total, available, frozen.
 */
"use client";

import type { WorkerStats } from "@/lib/api/worker-client";
import type { BalanceData } from "@/lib/api/balance-client";

interface EarningsCardProps {
  stats: WorkerStats;
  balance: BalanceData | null;
  onWithdraw: () => void;
}

export function EarningsCard({ stats, balance, onWithdraw }: EarningsCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-sm font-medium text-zinc-500">Earnings</h2>

      {/* Main balance */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-green-400">
          {balance?.amount_cents ?? 0}
        </span>
        <span className="text-sm text-zinc-500">🦐 available</span>
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        = ${((balance?.amount_cents ?? 0) / 100).toFixed(2)} USD
      </p>

      {/* Frozen + stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4 text-center text-xs">
        <StatItem
          label="Frozen"
          value={`${balance?.frozen_cents ?? 0}🦐`}
          color="text-yellow-500"
        />
        <StatItem
          label="Today"
          value={`${stats.earnings_today}🦐`}
          color="text-zinc-300"
        />
        <StatItem
          label="Lifetime"
          value={`${stats.total_earned}🦐`}
          color="text-zinc-300"
        />
      </div>

      {/* Withdraw button */}
      <button
        onClick={onWithdraw}
        disabled={!balance || balance.amount_cents < 500}
        className="mt-4 w-full rounded-lg border border-green-600 bg-green-600/10 py-2.5 text-sm font-medium text-green-500 transition-colors hover:bg-green-600/20 disabled:opacity-40"
      >
        Withdraw
      </button>
      {balance && balance.amount_cents < 500 && (
        <p className="mt-1 text-center text-xs text-zinc-600">
          Minimum withdrawal: 500🦐 ($5.00)
        </p>
      )}
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className={`mt-0.5 font-medium ${color}`}>{value}</div>
    </div>
  );
}

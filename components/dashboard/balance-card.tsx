"use client";

import type { BalanceData } from "@/lib/api/balance-client";

interface BalanceCardProps {
  balance: BalanceData;
  onDeposit: () => void;
}

export function BalanceCard({ balance, onDeposit }: BalanceCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="text-sm font-medium text-zinc-500">Available Balance</h2>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-orange-500">
          {balance.amount_cents}
        </span>
        <span className="text-sm text-zinc-500">🦐</span>
      </div>
      <p className="mt-1 text-xs text-zinc-600">
        = ${(balance.amount_cents / 100).toFixed(2)} USD
      </p>

      {balance.frozen_cents > 0 && (
        <div className="mt-3 text-xs text-zinc-500">
          Frozen: <span className="text-yellow-500">{balance.frozen_cents}🦐</span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-zinc-800 pt-4 text-center text-xs">
        <StatItem label="Deposited" value={balance.total_deposited} />
        <StatItem label="Earned" value={balance.total_earned} />
        <StatItem label="Withdrawn" value={balance.total_withdrawn} />
      </div>

      <button
        onClick={onDeposit}
        className="mt-4 w-full rounded-lg bg-orange-500 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-orange-400"
      >
        Add Funds
      </button>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-zinc-500">{label}</div>
      <div className="mt-0.5 font-medium text-zinc-300">{value}🦐</div>
    </div>
  );
}

"use client";

import type { BalanceData } from "@/lib/api/balance-client";

interface BalanceCardProps {
  balance: BalanceData;
  onDeposit: () => void;
}

export function BalanceCard({ balance, onDeposit }: BalanceCardProps) {
  return (
    <div className="rounded-xl border border-edge bg-surface-alt p-6">
      <h2 className="text-sm font-medium text-content-tertiary">Available Balance</h2>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold text-accent">
          {balance.amount_cents}
        </span>
        <span className="text-lg">🦐</span>
      </div>
      <p className="mt-1 text-xs text-content-tertiary">
        = ${(balance.amount_cents / 100).toFixed(2)} USD
      </p>

      {balance.frozen_cents > 0 && (
        <div className="mt-3 text-xs text-content-tertiary">
          Frozen: <span className="text-status-pending">{balance.frozen_cents} 🦐</span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-edge pt-4 text-center text-xs">
        <StatItem label="Deposited" value={balance.total_deposited} />
        <StatItem label="Earned" value={balance.total_earned} />
        <StatItem label="Withdrawn" value={balance.total_withdrawn} />
      </div>

      <button
        onClick={onDeposit}
        className="mt-4 w-full rounded-lg bg-accent py-2.5 text-sm font-medium text-page transition-colors hover:bg-accent-hover"
      >
        Add Funds
      </button>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-content-tertiary">{label}</div>
      <div className="mt-0.5 font-medium text-content-secondary">{value} 🦐</div>
    </div>
  );
}

/**
 * Modal for requesting a withdrawal from available balance.
 */
"use client";

import { useState } from "react";
import { requestWithdrawal } from "@/lib/api/worker-client";

interface WithdrawModalProps {
  open: boolean;
  availableCents: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function WithdrawModal({ open, availableCents, onClose, onSuccess }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const amountCents = Math.round(parseFloat(amount || "0") * 100);
  const isValid = amountCents >= 500 && amountCents <= availableCents;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await requestWithdrawal(amountCents);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Withdraw Funds</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Available: {availableCents}🦐 (${(availableCents / 100).toFixed(2)})
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-zinc-500">Amount (USD)</label>
            <input
              type="number"
              step="0.01"
              min="5"
              max={(availableCents / 100).toFixed(2)}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="5.00"
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-200 outline-none focus:border-green-500"
            />
            <p className="mt-1 text-xs text-zinc-600">
              Min $5.00 &middot; Max $500.00/day
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-medium text-zinc-950 hover:bg-green-500 disabled:opacity-40"
          >
            {loading ? "Processing..." : `Withdraw $${(amountCents / 100).toFixed(2)}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-sm text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

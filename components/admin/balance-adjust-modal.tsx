"use client";

import { useState, type FormEvent } from "react";
import { adjustBalance } from "@/lib/api/admin/admin-users-client";

interface BalanceAdjustModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BalanceAdjustModal({
  userId,
  onClose,
  onSuccess,
}: BalanceAdjustModalProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cents = Math.round(Number(amount));
    if (!cents || !reason.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await adjustBalance(userId, {
        amount_cents: cents,
        reason: reason.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to adjust");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6"
      >
        <h2 className="mb-4 text-sm font-semibold text-zinc-100">
          Adjust Balance
        </h2>

        <label className="mb-1 block text-xs text-zinc-400">
          Amount (positive = credit, negative = debit)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
          placeholder="e.g. 500 or -200"
          autoFocus
        />

        <label className="mb-1 block text-xs text-zinc-400">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
          rows={2}
          placeholder="Required"
        />

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !amount || !reason.trim()}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
}

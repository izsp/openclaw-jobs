"use client";

import { useState, type FormEvent } from "react";
import { updateWorker } from "@/lib/api/admin/admin-workers-client";
import { WORKER_TIERS, WORKER_STATUSES } from "@/lib/constants";
import type { WorkerTier, WorkerStatus } from "@/lib/types/worker.types";

interface WorkerUpdateModalProps {
  workerId: string;
  currentTier: WorkerTier;
  currentStatus: WorkerStatus;
  onClose: () => void;
  onSuccess: () => void;
}

export function WorkerUpdateModal({
  workerId,
  currentTier,
  currentStatus,
  onClose,
  onSuccess,
}: WorkerUpdateModalProps) {
  const [tier, setTier] = useState<WorkerTier>(currentTier);
  const [status, setStatus] = useState<WorkerStatus>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await updateWorker(workerId, { tier, status });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
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
          Update Worker
        </h2>

        <label className="mb-1 block text-xs text-zinc-400">Tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as WorkerTier)}
          className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
        >
          {WORKER_TIERS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <label className="mb-1 block text-xs text-zinc-400">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as WorkerStatus)}
          className="mb-3 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
        >
          {WORKER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

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
            disabled={loading}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

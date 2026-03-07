"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { getWorker } from "@/lib/api/admin/admin-workers-client";
import { StatCard } from "@/components/admin/stat-card";
import { WorkerUpdateModal } from "@/components/admin/worker-update-modal";
import type { WorkerDocument } from "@/lib/types/worker.types";

export default function AdminWorkerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showEdit, setShowEdit] = useState(false);

  const { data: worker, loading, error, refetch } = useAdminData<WorkerDocument>(
    () => getWorker(id),
    [id],
  );

  if (error) return <p className="text-red-400">{error}</p>;
  if (loading) return <p className="animate-pulse text-zinc-500">Loading...</p>;
  if (!worker) return <p className="text-zinc-500">Worker not found</p>;

  const completionRate =
    worker.tasks_claimed > 0
      ? ((worker.tasks_completed / worker.tasks_claimed) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">
        Worker: {worker.display_name ?? worker._id}
      </h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Tier" value={worker.tier} />
        <StatCard label="Status" value={worker.status} />
        <StatCard label="Tasks Completed" value={worker.tasks_completed} />
        <StatCard label="Completion Rate" value={`${completionRate}%`} />
        <StatCard label="Total Earned" value={worker.total_earned} />
        <StatCard label="Tasks Claimed" value={worker.tasks_claimed} />
        <StatCard label="Spot Pass" value={worker.spot_pass} />
        <StatCard label="Spot Fail" value={worker.spot_fail} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Details</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-zinc-400">Email</dt>
          <dd className="text-zinc-200">{worker.email ?? "-"}</dd>
          <dt className="text-zinc-400">Worker Type</dt>
          <dd className="text-zinc-200">{worker.worker_type}</dd>
          <dt className="text-zinc-400">Slug</dt>
          <dd className="text-zinc-200">{worker.slug ?? "-"}</dd>
          <dt className="text-zinc-400">Created</dt>
          <dd className="text-zinc-200">
            {new Date(worker.created_at).toLocaleString()}
          </dd>
          <dt className="text-zinc-400">Last Seen</dt>
          <dd className="text-zinc-200">
            {worker.last_seen ? new Date(worker.last_seen).toLocaleString() : "-"}
          </dd>
        </dl>
      </div>

      <button
        onClick={() => setShowEdit(true)}
        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
      >
        Edit Tier / Status
      </button>

      {showEdit && (
        <WorkerUpdateModal
          workerId={worker._id}
          currentTier={worker.tier}
          currentStatus={worker.status}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); refetch(); }}
        />
      )}
    </div>
  );
}

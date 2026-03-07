"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { getTask, retryTask, creditTask } from "@/lib/api/admin/admin-tasks-client";
import { StatCard } from "@/components/admin/stat-card";
import type { TaskDocument } from "@/lib/types/task.types";

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminTaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const { data: task, loading, error, refetch } = useAdminData<TaskDocument>(
    () => getTask(id),
    [id],
  );

  async function handleRetry() {
    setActionLoading(true);
    setActionMsg(null);
    try {
      await retryTask(id);
      setActionMsg("Task retried");
      refetch();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCredit() {
    setActionLoading(true);
    setActionMsg(null);
    try {
      await creditTask(id);
      setActionMsg("Task credited");
      refetch();
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : "Credit failed");
    } finally {
      setActionLoading(false);
    }
  }

  if (error) return <p className="text-red-400">{error}</p>;
  if (loading) return <p className="animate-pulse text-zinc-500">Loading...</p>;
  if (!task) return <p className="text-zinc-500">Task not found</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Task: {task._id}</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Status" value={task.status} />
        <StatCard label="Type" value={task.type} />
        <StatCard label="Price" value={fmt(task.price_cents)} />
        <StatCard label="Buyer" value={task.buyer_id.slice(0, 10)} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Details</h2>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <dt className="text-zinc-500">Worker</dt>
          <dd className="text-zinc-200">{task.worker_id ?? "-"}</dd>
          <dt className="text-zinc-500">Created</dt>
          <dd className="text-zinc-200">{new Date(task.created_at).toLocaleString()}</dd>
          {task.completed_at && (
            <>
              <dt className="text-zinc-500">Completed</dt>
              <dd className="text-zinc-200">{new Date(task.completed_at).toLocaleString()}</dd>
            </>
          )}
          <dt className="text-zinc-500">QA Task</dt>
          <dd className="text-zinc-200">{task._internal?.is_qa ? "Yes" : "No"}</dd>
        </dl>
      </div>

      {task._internal && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-400">
            QA Internal
          </h2>
          <pre className="overflow-x-auto text-xs text-zinc-300">
            {JSON.stringify(task._internal, null, 2)}
          </pre>
        </div>
      )}

      {task.output && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          <h2 className="mb-2 text-sm font-medium text-zinc-400">Output</h2>
          <pre className="whitespace-pre-wrap text-xs text-zinc-300">
            {task.output.content}
          </pre>
        </div>
      )}

      <div className="flex gap-3">
        {task.status === "failed" && (
          <button
            onClick={handleRetry}
            disabled={actionLoading}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            Retry
          </button>
        )}
        {task.status === "completed" && (
          <button
            onClick={handleCredit}
            disabled={actionLoading}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            Credit
          </button>
        )}
      </div>

      {actionMsg && (
        <p className="text-sm text-zinc-400">{actionMsg}</p>
      )}
    </div>
  );
}

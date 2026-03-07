"use client";

import { useAdminData } from "@/lib/hooks/use-admin-data";
import { adminGet } from "@/lib/api/admin/admin-fetch";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";

interface DashboardStats {
  total_users: number;
  active_workers: number;
  tasks_today: number;
  total_revenue_cents: number;
  recent_tasks: Record<string, unknown>[];
  recent_audit: Record<string, unknown>[];
}

const taskColumns: Column<Record<string, unknown>>[] = [
  { key: "_id", header: "ID", render: (t) => String(t._id).slice(0, 12) },
  { key: "type", header: "Type" },
  { key: "status", header: "Status" },
  {
    key: "created_at",
    header: "Created",
    render: (t) => new Date(t.created_at as string).toLocaleString(),
  },
];

const auditColumns: Column<Record<string, unknown>>[] = [
  { key: "type", header: "Type" },
  { key: "action", header: "Action" },
  {
    key: "created_at",
    header: "Time",
    render: (t) => new Date(t.created_at as string).toLocaleString(),
  },
];

export default function AdminDashboardPage() {
  const { data, loading, error } = useAdminData<DashboardStats>(
    () => adminGet("/api/admin/stats"),
    [],
  );

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Users"
          value={loading ? "..." : (data?.total_users ?? 0)}
        />
        <StatCard
          label="Active Workers"
          value={loading ? "..." : (data?.active_workers ?? 0)}
        />
        <StatCard
          label="Tasks Today"
          value={loading ? "..." : (data?.tasks_today ?? 0)}
        />
        <StatCard
          label="Revenue"
          value={loading ? "..." : `$${((data?.total_revenue_cents ?? 0) / 100).toFixed(2)}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium text-zinc-400">
            Recent Tasks
          </h2>
          <DataTable
            columns={taskColumns}
            data={data?.recent_tasks ?? []}
            loading={loading}
          />
        </div>
        <div>
          <h2 className="mb-2 text-sm font-medium text-zinc-400">
            Recent Audit
          </h2>
          <DataTable
            columns={auditColumns}
            data={data?.recent_audit ?? []}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}

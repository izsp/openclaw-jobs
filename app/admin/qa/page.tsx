"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { listQaTasks, getQaStats, type QaTaskListResult, type QaStats } from "@/lib/api/admin/admin-qa-client";
import { StatCard } from "@/components/admin/stat-card";
import { FilterBar, type FilterDef } from "@/components/admin/filter-bar";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { QA_TYPES } from "@/lib/constants";
import type { TaskDocument } from "@/lib/types/task.types";

const filterDefs: FilterDef[] = [
  {
    key: "qa_type",
    label: "All QA Types",
    options: QA_TYPES.map((t) => ({ value: t, label: t })),
  },
  {
    key: "verdict",
    label: "All Verdicts",
    options: [
      { value: "pass", label: "Pass" },
      { value: "flag", label: "Flag" },
      { value: "fail", label: "Fail" },
    ],
  },
];

const columns: Column<TaskDocument>[] = [
  { key: "_id", header: "Task ID", render: (t) => t._id.slice(0, 14) },
  {
    key: "qa_type",
    header: "QA Type",
    render: (t) => String(t._internal?.qa_type ?? "-"),
  },
  {
    key: "verdict",
    header: "Verdict",
    render: (t) => String(t._internal?.qa_result?.verdict ?? "-"),
  },
  { key: "worker_id", header: "Worker", render: (t) => (t.worker_id ?? "-").slice(0, 10) },
  {
    key: "created_at",
    header: "Created",
    render: (t) => new Date(t.created_at).toLocaleString(),
  },
];

export default function AdminQaPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const { data: stats, loading: statsLoading } = useAdminData<QaStats>(
    () => getQaStats(),
    [],
  );

  const { data, loading, error } = useAdminData<QaTaskListResult>(
    () =>
      listQaTasks({
        page: String(page),
        limit: "20",
        qa_type: filters.qa_type || undefined,
        verdict: filters.verdict || undefined,
      }),
    [page, filters.qa_type, filters.verdict],
  );

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">QA Monitoring</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard label="Total QA Tasks" value={statsLoading ? "..." : (stats?.total_qa_tasks ?? 0)} />
        <StatCard label="Pass" value={statsLoading ? "..." : (stats?.pass_count ?? 0)} />
        <StatCard label="Fail" value={statsLoading ? "..." : (stats?.fail_count ?? 0)} />
        <StatCard label="Flag" value={statsLoading ? "..." : (stats?.flag_count ?? 0)} />
        <StatCard label="Pass Rate" value={statsLoading ? "..." : `${((stats?.pass_rate ?? 0) * 100).toFixed(1)}%`} />
      </div>

      <FilterBar filters={filterDefs} values={filters} onChange={handleFilterChange} />

      {error && <p className="text-red-400">{error}</p>}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={loading}
        onRowClick={(t) => router.push(`/admin/tasks/${t._id}`)}
      />

      <Pagination
        page={page}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}

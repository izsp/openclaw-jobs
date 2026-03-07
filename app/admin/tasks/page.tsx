"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { listTasks, type AdminTaskListResult } from "@/lib/api/admin/admin-tasks-client";
import { FilterBar, type FilterDef } from "@/components/admin/filter-bar";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { TASK_STATUSES } from "@/lib/constants";
import type { TaskDocument } from "@/lib/types/task.types";

const filterDefs: FilterDef[] = [
  {
    key: "status",
    label: "All Statuses",
    options: TASK_STATUSES.map((s) => ({ value: s, label: s })),
  },
  {
    key: "is_qa",
    label: "All Tasks",
    options: [
      { value: "true", label: "QA Only" },
      { value: "false", label: "Non-QA Only" },
    ],
  },
];

const columns: Column<TaskDocument>[] = [
  { key: "_id", header: "ID", render: (t) => t._id.slice(0, 14) },
  { key: "type", header: "Type" },
  { key: "status", header: "Status" },
  { key: "price_cents", header: "Price", render: (t) => `$${(t.price_cents / 100).toFixed(2)}` },
  {
    key: "_internal",
    header: "QA",
    render: (t) => (t._internal?.is_qa ? "Yes" : "-"),
  },
  {
    key: "created_at",
    header: "Created",
    render: (t) => new Date(t.created_at).toLocaleString(),
  },
];

export default function AdminTasksPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const { data, loading, error } = useAdminData<AdminTaskListResult>(
    () =>
      listTasks({
        page: String(page),
        limit: "20",
        status: filters.status || undefined,
        is_qa: filters.is_qa || undefined,
      }),
    [page, filters.status, filters.is_qa],
  );

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Tasks</h1>

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

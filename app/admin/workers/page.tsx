"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { listWorkers, type AdminWorkerListResult } from "@/lib/api/admin/admin-workers-client";
import { SearchBar } from "@/components/admin/search-bar";
import { FilterBar, type FilterDef } from "@/components/admin/filter-bar";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { WORKER_TIERS, WORKER_STATUSES } from "@/lib/constants";
import type { WorkerDocument } from "@/lib/types/worker.types";

const filterDefs: FilterDef[] = [
  {
    key: "tier",
    label: "All Tiers",
    options: WORKER_TIERS.map((t) => ({ value: t, label: t })),
  },
  {
    key: "status",
    label: "All Statuses",
    options: WORKER_STATUSES.map((s) => ({ value: s, label: s })),
  },
];

const columns: Column<WorkerDocument>[] = [
  {
    key: "display_name",
    header: "Name",
    render: (w) => w.display_name || w._id.slice(0, 10),
  },
  { key: "tier", header: "Tier" },
  { key: "status", header: "Status" },
  { key: "tasks_completed", header: "Tasks" },
  { key: "total_earned", header: "Earned" },
];

export default function AdminWorkersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const { data, loading, error } = useAdminData<AdminWorkerListResult>(
    () =>
      listWorkers({
        page: String(page),
        limit: "20",
        search: search || undefined,
        tier: filters.tier || undefined,
        status: filters.status || undefined,
      }),
    [page, search, filters.tier, filters.status],
  );

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Workers</h1>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search workers..." />
        <FilterBar filters={filterDefs} values={filters} onChange={handleFilterChange} />
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={loading}
        onRowClick={(w) => router.push(`/admin/workers/${w._id}`)}
      />

      <Pagination
        page={page}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}

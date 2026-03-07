"use client";

import { useState, useCallback } from "react";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { listAuditEntries, type AuditListResult } from "@/lib/api/admin/admin-audit-client";
import { FilterBar, type FilterDef } from "@/components/admin/filter-bar";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";

const filterDefs: FilterDef[] = [
  {
    key: "type",
    label: "All Types",
    options: [
      { value: "balance", label: "Balance" },
      { value: "task", label: "Task" },
      { value: "worker", label: "Worker" },
      { value: "config", label: "Config" },
      { value: "auth", label: "Auth" },
    ],
  },
];

import type { AuditEntry } from "@/lib/api/admin/admin-audit-client";

const columns: Column<AuditEntry>[] = [
  { key: "type", header: "Type" },
  { key: "action", header: "Action" },
  {
    key: "actor",
    header: "Actor",
    render: (e) => (e.actor ?? "system").slice(0, 10),
  },
  {
    key: "details",
    header: "Details",
    render: (e) => {
      if (!e.details || typeof e.details !== "object") return "-";
      return Object.entries(e.details as Record<string, unknown>)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
        .slice(0, 80);
    },
  },
  {
    key: "created_at",
    header: "Time",
    render: (e) => new Date(e.created_at).toLocaleString(),
  },
];

export default function AdminAuditPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading, error } = useAdminData<AuditListResult>(
    () =>
      listAuditEntries({
        page: String(page),
        limit: "20",
        type: filters.type || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    [page, filters.type, from, to],
  );

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Audit Log</h1>

      <div className="flex flex-wrap items-center gap-3">
        <FilterBar filters={filterDefs} values={filters} onChange={handleFilterChange} />
        <label className="text-xs text-zinc-400">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
        />
        <label className="text-xs text-zinc-400">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <DataTable columns={columns} data={data?.items ?? []} loading={loading} />

      <Pagination
        page={page}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}

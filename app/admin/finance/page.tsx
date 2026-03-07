"use client";

import { useState, useCallback } from "react";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import {
  getFinanceSummary,
  listTransactions,
  type FinanceSummary,
  type FinanceTransactionListResult,
} from "@/lib/api/admin/admin-finance-client";
import { StatCard } from "@/components/admin/stat-card";
import { FilterBar, type FilterDef } from "@/components/admin/filter-bar";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { TRANSACTION_TYPES } from "@/lib/constants";
import type { TransactionDocument } from "@/lib/types/balance.types";

const filterDefs: FilterDef[] = [
  {
    key: "type",
    label: "All Types",
    options: TRANSACTION_TYPES.map((t) => ({ value: t, label: t })),
  },
];

const txColumns: Column<TransactionDocument>[] = [
  { key: "user_id", header: "User", render: (t) => t.user_id.slice(0, 10) },
  { key: "type", header: "Type" },
  { key: "amount_cents", header: "Amount", render: (t) => fmt(t.amount_cents) },
  { key: "balance_after", header: "After", render: (t) => fmt(t.balance_after) },
  {
    key: "created_at",
    header: "Date",
    render: (t) => new Date(t.created_at).toLocaleString(),
  },
];

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AdminFinancePage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const { data: summary, loading: summaryLoading } = useAdminData<FinanceSummary>(
    () => getFinanceSummary({ from: from || undefined, to: to || undefined }),
    [from, to],
  );

  const { data: txData, loading: txLoading, error } = useAdminData<FinanceTransactionListResult>(
    () =>
      listTransactions({
        page: String(page),
        limit: "20",
        from: from || undefined,
        to: to || undefined,
        type: filters.type || undefined,
      }),
    [page, from, to, filters.type],
  );

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Finance</h1>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs text-zinc-400">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
        />
        <label className="text-xs text-zinc-400">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-orange-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Deposits" value={summaryLoading ? "..." : fmt(summary?.total_deposits ?? 0)} />
        <StatCard label="Worker Earnings" value={summaryLoading ? "..." : fmt(summary?.total_worker_earnings ?? 0)} />
        <StatCard label="Platform Revenue" value={summaryLoading ? "..." : fmt(summary?.platform_revenue ?? 0)} />
        <StatCard label="Total Credits" value={summaryLoading ? "..." : fmt(summary?.total_credits ?? 0)} />
      </div>

      <FilterBar filters={filterDefs} values={filters} onChange={handleFilterChange} />

      {error && <p className="text-red-400">{error}</p>}

      <DataTable columns={txColumns} data={txData?.items ?? []} loading={txLoading} />

      <Pagination
        page={page}
        totalPages={txData?.total_pages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}

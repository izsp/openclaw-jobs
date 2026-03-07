"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import {
  getUser,
  getUserTransactions,
  type AdminUserDetail,
  type AdminTransactionListResult,
} from "@/lib/api/admin/admin-users-client";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { BalanceAdjustModal } from "@/components/admin/balance-adjust-modal";

import type { TransactionDocument } from "@/lib/types/balance.types";

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const txColumns: Column<TransactionDocument>[] = [
  { key: "type", header: "Type" },
  { key: "amount_cents", header: "Amount", render: (t) => fmt(t.amount_cents) },
  { key: "balance_after", header: "After", render: (t) => fmt(t.balance_after) },
  {
    key: "created_at",
    header: "Date",
    render: (t) => new Date(t.created_at).toLocaleString(),
  },
];

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showAdjust, setShowAdjust] = useState(false);
  const [txPage, setTxPage] = useState(1);

  const { data: user, loading, error, refetch } = useAdminData<AdminUserDetail>(
    () => getUser(id),
    [id],
  );

  const { data: txData, loading: txLoading } = useAdminData<AdminTransactionListResult>(
    () => getUserTransactions(id, { page: String(txPage), limit: "20" }),
    [id, txPage],
  );

  if (error) return <p className="text-red-400">{error}</p>;
  if (loading) return <p className="animate-pulse text-zinc-500">Loading...</p>;
  if (!user) return <p className="text-zinc-500">User not found</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">User: {user.user.email ?? user.user._id}</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Role" value={user.user.role} />
        <StatCard label="Balance" value={fmt(user.balance?.amount_cents ?? 0)} />
        <StatCard label="Frozen" value={fmt(user.balance?.frozen_cents ?? 0)} />
        <StatCard
          label="Created"
          value={new Date(user.user.created_at).toLocaleDateString()}
        />
      </div>

      <button
        onClick={() => setShowAdjust(true)}
        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
      >
        Adjust Balance
      </button>

      <div>
        <h2 className="mb-2 text-sm font-medium text-zinc-400">Transactions</h2>
        <DataTable
          columns={txColumns}
          data={txData?.items ?? []}
          loading={txLoading}
        />
        <Pagination
          page={txPage}
          totalPages={txData?.total_pages ?? 1}
          onPageChange={setTxPage}
        />
      </div>

      {showAdjust && (
        <BalanceAdjustModal
          userId={id}
          onClose={() => setShowAdjust(false)}
          onSuccess={() => { setShowAdjust(false); refetch(); }}
        />
      )}
    </div>
  );
}

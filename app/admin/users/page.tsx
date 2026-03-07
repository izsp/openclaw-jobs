"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { listUsers, type AdminUserListResult } from "@/lib/api/admin/admin-users-client";
import { SearchBar } from "@/components/admin/search-bar";
import { FilterBar, type FilterDef } from "@/components/admin/filter-bar";
import { DataTable, type Column } from "@/components/admin/data-table";
import { Pagination } from "@/components/admin/pagination";
import { USER_ROLES } from "@/lib/constants";
import type { UserDocument } from "@/lib/types/user.types";

const roleFilter: FilterDef[] = [
  {
    key: "role",
    label: "All Roles",
    options: USER_ROLES.map((r) => ({ value: r, label: r })),
  },
];

const columns: Column<UserDocument>[] = [
  { key: "email", header: "Email" },
  { key: "role", header: "Role" },
  {
    key: "created_at",
    header: "Created",
    render: (u) => new Date(u.created_at).toLocaleDateString(),
  },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);

  const { data, loading, error } = useAdminData<AdminUserListResult>(
    () =>
      listUsers({
        page: String(page),
        limit: "20",
        search: search || undefined,
        role: filters.role || undefined,
      }),
    [page, search, filters.role],
  );

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Users</h1>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by email..." />
        <FilterBar filters={roleFilter} values={filters} onChange={handleFilterChange} />
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={loading}
        onRowClick={(u) => router.push(`/admin/users/${u._id}`)}
      />

      <Pagination
        page={page}
        totalPages={data?.total_pages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}

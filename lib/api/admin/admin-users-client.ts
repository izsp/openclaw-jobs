"use client";

import { adminGet, adminPost } from "./admin-fetch";
import type { UserDocument } from "@/lib/types/user.types";
import type { TransactionDocument } from "@/lib/types/balance.types";

export interface AdminUserListParams {
  page?: string;
  limit?: string;
  search?: string;
  role?: string;
}

export interface AdminUserListResult {
  items: UserDocument[];
  total: number;
  page: number;
  total_pages: number;
}

export interface AdminUserDetail {
  user: UserDocument;
  balance: { amount_cents: number; frozen_cents: number } | null;
}

export interface AdminTransactionListResult {
  items: TransactionDocument[];
  total: number;
  page: number;
  total_pages: number;
}

export interface AdjustBalanceBody {
  amount_cents: number;
  reason: string;
}

/** List users with pagination and filters. */
export function listUsers(params: AdminUserListParams): Promise<AdminUserListResult> {
  return adminGet("/api/admin/users", params as Record<string, string>);
}

/** Get a single user with balance info. */
export function getUser(id: string): Promise<AdminUserDetail> {
  return adminGet(`/api/admin/users/${encodeURIComponent(id)}`);
}

/** Get a user's transactions. */
export function getUserTransactions(
  id: string,
  params?: { page?: string; limit?: string },
): Promise<AdminTransactionListResult> {
  return adminGet(
    `/api/admin/users/${encodeURIComponent(id)}/transactions`,
    params as Record<string, string>,
  );
}

/** Adjust a user's balance (positive=credit, negative=debit). */
export function adjustBalance(id: string, body: AdjustBalanceBody): Promise<{ balance_after: number }> {
  return adminPost(`/api/admin/users/${encodeURIComponent(id)}/adjust-balance`, body);
}

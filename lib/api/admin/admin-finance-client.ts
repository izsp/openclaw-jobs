"use client";

import { adminGet } from "./admin-fetch";
import type { TransactionDocument } from "@/lib/types/balance.types";

export interface FinanceSummary {
  total_deposits: number;
  total_task_payments: number;
  total_worker_earnings: number;
  total_credits: number;
  total_admin_adjustments: number;
  platform_revenue: number;
  period: { from: string; to: string };
}

export interface FinanceParams {
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
  type?: string;
}

export interface FinanceTransactionListResult {
  items: TransactionDocument[];
  total: number;
  page: number;
  total_pages: number;
}

/** Get aggregated finance summary. */
export function getFinanceSummary(params?: FinanceParams): Promise<FinanceSummary> {
  return adminGet("/api/admin/finance/summary", params as Record<string, string>);
}

/** List all transactions with filters. */
export function listTransactions(params?: FinanceParams): Promise<FinanceTransactionListResult> {
  return adminGet("/api/admin/finance/transactions", params as Record<string, string>);
}

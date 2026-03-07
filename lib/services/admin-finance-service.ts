/**
 * Admin finance service — revenue summary and transaction listing.
 */
import { COLLECTIONS } from "@/lib/constants";
import type {
  TransactionDocument,
  FinanceSummary,
  PaginatedResult,
  PaginationParams,
} from "@/lib/types";
import { getDb } from "@/lib/db";

/**
 * Aggregates financial summary for a date range.
 * Groups transactions by type and computes platform revenue.
 */
export async function getFinanceSummary(
  from: Date,
  to: Date,
): Promise<FinanceSummary> {
  const db = await getDb();

  const pipeline = await db
    .collection<TransactionDocument>(COLLECTIONS.TRANSACTION)
    .aggregate([
      { $match: { created_at: { $gte: from, $lte: to } } },
      { $group: { _id: "$type", total: { $sum: "$amount_cents" } } },
    ])
    .toArray();

  const byType: Record<string, number> = {};
  for (const row of pipeline) {
    byType[row._id as string] = row.total;
  }

  const totalDeposits = byType["deposit"] ?? 0;
  // WHY: task_pay amounts are negative (debits), so we take absolute value.
  const totalTaskPayments = Math.abs(byType["task_pay"] ?? 0);
  const totalWorkerEarnings = (byType["task_earn"] ?? 0) + (byType["freeze"] ?? 0);
  const totalCredits = byType["credit"] ?? 0;
  const adminCredits = byType["admin_credit"] ?? 0;
  const adminDebits = byType["admin_debit"] ?? 0;

  return {
    total_deposits: totalDeposits,
    total_task_payments: totalTaskPayments,
    total_worker_earnings: totalWorkerEarnings,
    total_credits: totalCredits,
    total_admin_adjustments: adminCredits + adminDebits,
    // WHY: Platform revenue = what buyers paid minus what workers earned minus credits.
    platform_revenue: totalTaskPayments - totalWorkerEarnings - totalCredits,
    period: { from, to },
  };
}

/**
 * Lists all transactions with pagination and optional filters.
 * Supports filtering by type and date range.
 */
export async function listAllTransactions(
  params: PaginationParams & {
    type?: string;
    user_id?: string;
    from?: Date;
    to?: Date;
  },
): Promise<PaginatedResult<TransactionDocument>> {
  const db = await getDb();
  const col = db.collection<TransactionDocument>(COLLECTIONS.TRANSACTION);

  const filter: Record<string, unknown> = {};
  if (params.type) filter.type = params.type;
  if (params.user_id) filter.user_id = params.user_id;

  if (params.from || params.to) {
    const dateFilter: Record<string, Date> = {};
    if (params.from) dateFilter.$gte = params.from;
    if (params.to) dateFilter.$lte = params.to;
    filter.created_at = dateFilter;
  }

  const [items, total] = await Promise.all([
    col
      .find(filter)
      .sort({ created_at: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .toArray(),
    col.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: params.page,
    limit: params.limit,
    total_pages: Math.ceil(total / params.limit),
  };
}

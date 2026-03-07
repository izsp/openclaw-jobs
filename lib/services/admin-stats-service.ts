/**
 * Admin stats service — dashboard and QA statistics via aggregation.
 */
import { COLLECTIONS } from "@/lib/constants";
import type { DashboardStats, QaStats } from "@/lib/types";
import { getDb } from "@/lib/db";

/** Extended dashboard data including recent items for the overview page. */
export interface DashboardData extends DashboardStats {
  recent_tasks: Record<string, unknown>[];
  recent_audit: Record<string, unknown>[];
}

/**
 * Returns dashboard overview statistics plus recent tasks and audit entries.
 * Uses parallel MongoDB count/aggregate operations for efficiency.
 */
export async function getDashboardStats(): Promise<DashboardData> {
  const db = await getDb();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    total_users,
    total_workers,
    active_workers,
    total_tasks,
    tasks_today,
    tasks_pending,
    revenuePipeline,
    depositsPipeline,
    recent_tasks,
    recent_audit,
  ] = await Promise.all([
    db.collection(COLLECTIONS.USER).countDocuments(),
    db.collection(COLLECTIONS.WORKER).countDocuments(),
    db.collection(COLLECTIONS.WORKER).countDocuments({ status: "active" }),
    db.collection(COLLECTIONS.TASK).countDocuments(),
    db.collection(COLLECTIONS.TASK).countDocuments({ created_at: { $gte: todayStart } }),
    db.collection(COLLECTIONS.TASK).countDocuments({ status: "pending" }),
    db.collection(COLLECTIONS.TRANSACTION).aggregate([
      { $match: { type: "task_pay" } },
      { $group: { _id: null, total: { $sum: "$amount_cents" } } },
    ]).toArray(),
    db.collection(COLLECTIONS.TRANSACTION).aggregate([
      { $match: { type: "deposit" } },
      { $group: { _id: null, total: { $sum: "$amount_cents" } } },
    ]).toArray(),
    db.collection(COLLECTIONS.TASK)
      .find({}, { projection: { _id: 1, type: 1, status: 1, created_at: 1 } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray(),
    db.collection(COLLECTIONS.AUDIT_LOG)
      .find({}, { projection: { _id: 1, type: 1, action: 1, created_at: 1 } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray(),
  ]);

  return {
    total_users,
    total_workers,
    active_workers,
    total_tasks,
    tasks_today,
    tasks_pending,
    total_revenue_cents: Math.abs(revenuePipeline[0]?.total ?? 0),
    total_deposits_cents: depositsPipeline[0]?.total ?? 0,
    recent_tasks,
    recent_audit,
  };
}

/**
 * Returns QA system statistics with breakdown by QA type.
 * Aggregates verdict results across all QA tasks.
 */
export async function getQaStats(): Promise<QaStats> {
  const db = await getDb();

  const pipeline = await db.collection(COLLECTIONS.TASK).aggregate([
    { $match: { "_internal.is_qa": true } },
    {
      $group: {
        _id: "$_internal.qa_type",
        total: { $sum: 1 },
        pass: { $sum: { $cond: [{ $eq: ["$_internal.qa_result.verdict", "pass"] }, 1, 0] } },
        fail: { $sum: { $cond: [{ $eq: ["$_internal.qa_result.verdict", "fail"] }, 1, 0] } },
        flag: { $sum: { $cond: [{ $eq: ["$_internal.qa_result.verdict", "flag"] }, 1, 0] } },
      },
    },
  ]).toArray();

  let totalQa = 0;
  let passCount = 0;
  let failCount = 0;
  let flagCount = 0;
  const byType: QaStats["by_type"] = {};

  for (const row of pipeline) {
    const key = (row._id as string) ?? "unknown";
    byType[key] = { total: row.total, pass: row.pass, fail: row.fail, flag: row.flag };
    totalQa += row.total;
    passCount += row.pass;
    failCount += row.fail;
    flagCount += row.flag;
  }

  return {
    total_qa_tasks: totalQa,
    pass_count: passCount,
    fail_count: failCount,
    flag_count: flagCount,
    pass_rate: totalQa > 0 ? passCount / totalQa : 0,
    by_type: byType,
  };
}

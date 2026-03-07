/**
 * Admin panel types — dashboard stats, pagination, audit log, finance.
 */

/** Pagination parameters for list endpoints. */
export interface PaginationParams {
  page: number;
  limit: number;
}

/** Paginated result wrapper for list endpoints. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Dashboard overview statistics. */
export interface DashboardStats {
  total_users: number;
  total_workers: number;
  active_workers: number;
  total_tasks: number;
  tasks_today: number;
  tasks_pending: number;
  total_revenue_cents: number;
  total_deposits_cents: number;
}

/** QA system statistics. */
export interface QaStats {
  total_qa_tasks: number;
  pass_count: number;
  fail_count: number;
  flag_count: number;
  pass_rate: number;
  by_type: Record<string, { total: number; pass: number; fail: number; flag: number }>;
}

/** Financial summary for a date range. */
export interface FinanceSummary {
  total_deposits: number;
  total_task_payments: number;
  total_worker_earnings: number;
  total_credits: number;
  total_admin_adjustments: number;
  platform_revenue: number;
  period: { from: Date; to: Date };
}

/** Audit log entry shape. */
export interface AuditLogEntry {
  _id: string;
  type: string;
  action: string;
  actor: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: Date;
}

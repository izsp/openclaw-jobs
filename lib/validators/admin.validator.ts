/**
 * Zod schemas for admin panel API input validation.
 */
import { z } from "zod";
import {
  WORKER_TIERS,
  WORKER_STATUSES,
  TASK_STATUSES,
  TRANSACTION_TYPES,
  QA_TYPES,
} from "@/lib/constants";

/** Pagination parameters shared across all list endpoints. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Date range filter. */
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/** GET /api/admin/users — list users with search and role filter. */
export const userListSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  role: z.enum(["buyer", "seller", "both"]).optional(),
});

/** GET /api/admin/workers — list workers with search and filters. */
export const workerListSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
  tier: z.enum(WORKER_TIERS).optional(),
  status: z.enum(WORKER_STATUSES).optional(),
});

/** GET /api/admin/tasks — list tasks with filters. */
export const taskListSchema = paginationSchema.extend({
  status: z.enum(TASK_STATUSES).optional(),
  is_qa: z.coerce.boolean().optional(),
  worker_id: z.string().optional(),
  buyer_id: z.string().optional(),
});

/** POST /api/admin/users/[id]/balance — adjust user balance. */
export const balanceAdjustSchema = z.object({
  amount_cents: z.number().int().refine((v) => v !== 0, "Amount must not be zero"),
  reason: z.string().min(1).max(500),
});

/** PATCH /api/admin/workers/[id] — update worker tier or status. */
export const workerUpdateSchema = z.object({
  tier: z.enum(WORKER_TIERS).optional(),
  status: z.enum(WORKER_STATUSES).optional(),
});

/** GET /api/admin/audit — list audit log entries. */
export const auditListSchema = paginationSchema.merge(dateRangeSchema).extend({
  type: z.string().max(100).optional(),
  action: z.string().max(100).optional(),
});

/** GET /api/admin/qa/tasks — list QA tasks. */
export const qaTaskListSchema = paginationSchema.extend({
  qa_type: z.enum(QA_TYPES).optional(),
  verdict: z.enum(["pass", "flag", "fail"]).optional(),
});

/** GET /api/admin/finance/transactions — list transactions. */
export const financeTransactionSchema = paginationSchema.merge(dateRangeSchema).extend({
  type: z.enum(TRANSACTION_TYPES).optional(),
});

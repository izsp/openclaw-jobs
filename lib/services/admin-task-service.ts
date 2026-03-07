/**
 * Admin task service — list, view, retry, and credit tasks.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS } from "@/lib/constants";
import type {
  TaskDocument,
  BalanceDocument,
  TransactionDocument,
  PaginatedResult,
  PaginationParams,
  AuditLogEntry,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { NotFoundError, ConflictError } from "@/lib/errors";

/**
 * Lists tasks with filters. Includes _internal for admin visibility.
 * Supports filtering by status, is_qa flag, worker_id, and buyer_id.
 */
export async function listTasks(
  params: PaginationParams & {
    status?: string;
    is_qa?: boolean;
    worker_id?: string;
    buyer_id?: string;
  },
): Promise<PaginatedResult<TaskDocument>> {
  const db = await getDb();
  const col = db.collection<TaskDocument>(COLLECTIONS.TASK);

  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.is_qa !== undefined) filter["_internal.is_qa"] = params.is_qa;
  if (params.worker_id) filter.worker_id = params.worker_id;
  if (params.buyer_id) filter.buyer_id = params.buyer_id;

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

/**
 * Lists QA tasks with optional qa_type and verdict filters.
 * Always filters for _internal.is_qa = true.
 */
export async function listQaTasks(
  params: PaginationParams & {
    qa_type?: string;
    verdict?: string;
  },
): Promise<PaginatedResult<TaskDocument>> {
  const db = await getDb();
  const col = db.collection<TaskDocument>(COLLECTIONS.TASK);

  const filter: Record<string, unknown> = { "_internal.is_qa": true };
  if (params.qa_type) filter["_internal.qa_type"] = params.qa_type;
  if (params.verdict) filter["_internal.qa_result.verdict"] = params.verdict;

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

/**
 * Returns a complete task document including _internal metadata.
 * @throws NotFoundError if task does not exist.
 */
export async function getTaskFull(taskId: string): Promise<TaskDocument> {
  const db = await getDb();
  const task = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOne({ _id: taskId });

  if (!task) {
    throw new NotFoundError("Task");
  }
  return task;
}

/**
 * Resets a failed/completed task back to pending for re-dispatch.
 * Clears worker assignment, deadline, and output.
 * @throws NotFoundError if task does not exist.
 * @throws ConflictError if task is already pending or assigned.
 */
export async function retryTask(
  taskId: string,
  actorId: string,
): Promise<TaskDocument> {
  const db = await getDb();

  const result = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOneAndUpdate(
      { _id: taskId, status: { $in: ["completed", "failed", "credited"] } },
      {
        $set: {
          status: "pending" as const,
          worker_id: null,
          assigned_at: null,
          deadline: null,
          output: null,
          completed_at: null,
        },
      },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new NotFoundError("Task (or task not in retryable state)");
  }

  const audit: AuditLogEntry = {
    _id: nanoid(),
    type: "admin",
    action: "task_retry",
    actor: actorId,
    target_id: taskId,
    details: null,
    created_at: new Date(),
  };
  await db.collection<AuditLogEntry>(COLLECTIONS.AUDIT_LOG).insertOne(audit);

  return result;
}

/**
 * Credits the buyer for a task and marks it as credited.
 * Atomically updates buyer balance and records transaction + audit log.
 * @throws NotFoundError if task does not exist.
 * @throws ConflictError if task is already credited.
 */
export async function adminCreditTask(
  taskId: string,
  actorId: string,
): Promise<TaskDocument> {
  const db = await getDb();

  const task = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOneAndUpdate(
      { _id: taskId, status: { $ne: "credited" } },
      { $set: { status: "credited" as const } },
      { returnDocument: "before" },
    );

  if (!task) {
    throw new ConflictError("Task not found or already credited");
  }

  // Credit the buyer's balance
  const balanceResult = await db
    .collection<BalanceDocument>(COLLECTIONS.BALANCE)
    .findOneAndUpdate(
      { _id: task.buyer_id },
      { $inc: { amount_cents: task.price_cents } },
      { returnDocument: "after" },
    );

  if (balanceResult) {
    const tx: TransactionDocument = {
      _id: nanoid(),
      user_id: task.buyer_id,
      type: "admin_credit",
      amount_cents: task.price_cents,
      balance_after: balanceResult.amount_cents,
      ref_id: taskId,
      created_at: new Date(),
    };
    await db.collection<TransactionDocument>(COLLECTIONS.TRANSACTION).insertOne(tx);
  }

  const audit: AuditLogEntry = {
    _id: nanoid(),
    type: "admin",
    action: "task_credit",
    actor: actorId,
    target_id: taskId,
    details: { buyer_id: task.buyer_id, amount_cents: task.price_cents },
    created_at: new Date(),
  };
  await db.collection<AuditLogEntry>(COLLECTIONS.AUDIT_LOG).insertOne(audit);

  return { ...task, status: "credited" };
}

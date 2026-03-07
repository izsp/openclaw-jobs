/**
 * Admin worker service — list, view, and update workers.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS } from "@/lib/constants";
import type {
  WorkerDocument,
  WorkerTier,
  WorkerStatus,
  PaginatedResult,
  PaginationParams,
  AuditLogEntry,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

/** Worker document without token_hash (safe for admin responses). */
export type WorkerAdminView = Omit<WorkerDocument, "token_hash">;

/**
 * Lists workers with optional search, tier, and status filters.
 * Searches display_name, email, slug, and _id. Never returns token_hash.
 */
export async function listWorkers(
  params: PaginationParams & { search?: string; tier?: string; status?: string },
): Promise<PaginatedResult<WorkerAdminView>> {
  const db = await getDb();
  const col = db.collection<WorkerDocument>(COLLECTIONS.WORKER);

  const filter: Record<string, unknown> = {};
  if (params.search) {
    const regex = { $regex: params.search, $options: "i" };
    filter.$or = [
      { display_name: regex },
      { email: regex },
      { slug: regex },
      { _id: params.search },
    ];
  }
  if (params.tier) filter.tier = params.tier;
  if (params.status) filter.status = params.status;

  const [items, total] = await Promise.all([
    col
      .find(filter, { projection: { token_hash: 0 } })
      .sort({ created_at: -1 })
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .toArray(),
    col.countDocuments(filter),
  ]);

  return {
    items: items as WorkerAdminView[],
    total,
    page: params.page,
    limit: params.limit,
    total_pages: Math.ceil(total / params.limit),
  };
}

/**
 * Returns full worker document excluding token_hash.
 * @throws NotFoundError if worker does not exist.
 */
export async function getWorkerFull(workerId: string): Promise<WorkerAdminView> {
  const db = await getDb();
  const worker = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .findOne({ _id: workerId }, { projection: { token_hash: 0 } });

  if (!worker) {
    throw new NotFoundError("Worker");
  }
  return worker as WorkerAdminView;
}

/**
 * Updates a worker's tier and/or status with audit trail.
 * @throws NotFoundError if worker does not exist.
 */
export async function updateWorkerAdmin(
  workerId: string,
  update: { tier?: WorkerTier; status?: WorkerStatus },
  actorId: string,
): Promise<WorkerAdminView> {
  const db = await getDb();

  const setFields: Record<string, unknown> = {};
  if (update.tier) setFields.tier = update.tier;
  if (update.status) setFields.status = update.status;

  if (Object.keys(setFields).length === 0) {
    return getWorkerFull(workerId);
  }

  const result = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .findOneAndUpdate(
      { _id: workerId },
      { $set: setFields },
      { returnDocument: "after", projection: { token_hash: 0 } },
    );

  if (!result) {
    throw new NotFoundError("Worker");
  }

  const audit: AuditLogEntry = {
    _id: nanoid(),
    type: "admin",
    action: "worker_update",
    actor: actorId,
    target_id: workerId,
    details: { changes: setFields },
    created_at: new Date(),
  };
  await db.collection<AuditLogEntry>(COLLECTIONS.AUDIT_LOG).insertOne(audit);

  return result as WorkerAdminView;
}

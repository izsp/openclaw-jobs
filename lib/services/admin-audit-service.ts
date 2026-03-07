/**
 * Admin audit service — log and query audit trail entries.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS } from "@/lib/constants";
import type { AuditLogEntry, PaginatedResult, PaginationParams } from "@/lib/types";
import { getDb } from "@/lib/db";

/**
 * Inserts an audit log entry for an admin action.
 * Called by other admin services after mutations.
 */
export async function logAdminAction(
  type: string,
  action: string,
  actor: string,
  targetId: string | null,
  details: Record<string, unknown> | null,
): Promise<void> {
  const db = await getDb();
  const entry: AuditLogEntry = {
    _id: nanoid(),
    type,
    action,
    actor,
    target_id: targetId,
    details,
    created_at: new Date(),
  };
  await db.collection<AuditLogEntry>(COLLECTIONS.AUDIT_LOG).insertOne(entry);
}

/**
 * Lists audit log entries with pagination and optional filters.
 * Supports filtering by type, action, and date range.
 */
export async function listAuditEntries(
  params: PaginationParams & {
    type?: string;
    action?: string;
    from?: Date;
    to?: Date;
  },
): Promise<PaginatedResult<AuditLogEntry>> {
  const db = await getDb();
  const col = db.collection<AuditLogEntry>(COLLECTIONS.AUDIT_LOG);

  const filter: Record<string, unknown> = {};
  if (params.type) filter.type = params.type;
  if (params.action) filter.action = params.action;

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

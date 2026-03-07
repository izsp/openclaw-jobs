/**
 * Admin user service — list users, view details, adjust balances.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS } from "@/lib/constants";
import type {
  UserDocument,
  BalanceDocument,
  TransactionDocument,
  TransactionType,
  PaginatedResult,
  PaginationParams,
  AuditLogEntry,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

/** User with balance joined. */
interface UserWithBalance extends UserDocument {
  balance: BalanceDocument | null;
}

/**
 * Lists users with optional search and role filter, paginated.
 * Searches email using regex (case-insensitive).
 */
export async function listUsers(
  params: PaginationParams & { search?: string; role?: string },
): Promise<PaginatedResult<UserDocument>> {
  const db = await getDb();
  const col = db.collection<UserDocument>(COLLECTIONS.USER);

  const filter: Record<string, unknown> = {};
  if (params.search) {
    filter.email = { $regex: params.search, $options: "i" };
  }
  if (params.role) {
    filter.role = params.role;
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

/**
 * Returns a single user with their balance document joined.
 * @throws NotFoundError if user does not exist.
 */
export async function getUserWithBalance(userId: string): Promise<UserWithBalance> {
  const db = await getDb();

  const [user, balance] = await Promise.all([
    db.collection<UserDocument>(COLLECTIONS.USER).findOne({ _id: userId }),
    db.collection<BalanceDocument>(COLLECTIONS.BALANCE).findOne({ _id: userId }),
  ]);

  if (!user) {
    throw new NotFoundError("User");
  }

  return { ...user, balance };
}

/**
 * Atomically adjusts a user's balance (credit or debit) with audit trail.
 * Positive amount_cents = credit, negative = debit.
 * Uses conditional update to prevent negative balance on debit.
 *
 * @throws NotFoundError if balance does not exist
 * @throws Error if debit would result in negative balance
 */
export async function adjustBalance(
  userId: string,
  amountCents: number,
  reason: string,
  actorId: string,
): Promise<number> {
  const db = await getDb();
  const isCredit = amountCents > 0;
  const txType: TransactionType = isCredit ? "admin_credit" : "admin_debit";

  const query: Record<string, unknown> = { _id: userId };
  if (!isCredit) {
    // WHY: Prevent negative balance — only match if sufficient funds.
    query.amount_cents = { $gte: Math.abs(amountCents) };
  }

  const result = await db
    .collection<BalanceDocument>(COLLECTIONS.BALANCE)
    .findOneAndUpdate(
      query,
      { $inc: { amount_cents: amountCents } },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new NotFoundError("Balance (or insufficient funds for debit)");
  }

  // Record transaction
  const tx: TransactionDocument = {
    _id: nanoid(),
    user_id: userId,
    type: txType,
    amount_cents: amountCents,
    balance_after: result.amount_cents,
    ref_id: null,
    created_at: new Date(),
  };
  await db.collection<TransactionDocument>(COLLECTIONS.TRANSACTION).insertOne(tx);

  // Record audit log
  const audit: AuditLogEntry = {
    _id: nanoid(),
    type: "admin",
    action: isCredit ? "balance_credit" : "balance_debit",
    actor: actorId,
    target_id: userId,
    details: { amount_cents: amountCents, reason, balance_after: result.amount_cents },
    created_at: new Date(),
  };
  await db.collection<AuditLogEntry>(COLLECTIONS.AUDIT_LOG).insertOne(audit);

  return result.amount_cents;
}

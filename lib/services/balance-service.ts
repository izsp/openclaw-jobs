/**
 * Balance service — handles all monetary operations.
 * All balance mutations use atomic conditional updates or transactions.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS } from "@/lib/constants";
import type { BalanceDocument, FrozenEarningDocument, TransactionDocument, TransactionType } from "@/lib/types";
import { getDb } from "@/lib/db";
import { BalanceError, NotFoundError } from "@/lib/errors";

/**
 * Initializes a balance document for a new user.
 * Uses upsert to be idempotent — safe to call multiple times.
 *
 * @param userId - The user's internal ID
 * @param initialCents - Initial balance (e.g. signup bonus)
 */
export async function initializeBalance(
  userId: string,
  initialCents: number,
): Promise<void> {
  const db = await getDb();
  await db.collection<BalanceDocument>(COLLECTIONS.BALANCE).updateOne(
    { _id: userId },
    {
      $setOnInsert: {
        amount_cents: initialCents,
        frozen_cents: 0,
        total_deposited: 0,
        total_earned: 0,
        total_withdrawn: 0,
      },
    },
    { upsert: true },
  );
}

/**
 * Returns the current balance for a user.
 *
 * @throws NotFoundError if no balance document exists
 */
export async function getBalance(userId: string): Promise<BalanceDocument> {
  const db = await getDb();
  const balance = await db
    .collection<BalanceDocument>(COLLECTIONS.BALANCE)
    .findOne({ _id: userId });

  if (!balance) {
    throw new NotFoundError("Balance");
  }
  return balance;
}

/**
 * Atomically deducts from a user's balance.
 * Uses conditional update to prevent negative balance.
 * @throws BalanceError if insufficient funds
 */
export async function deductBalance(
  userId: string,
  amountCents: number,
  refId: string,
  type: TransactionType,
): Promise<number> {
  const db = await getDb();

  // WHY: Conditional update in the query ensures atomic check-and-deduct.
  // If amount_cents < amountCents, no document matches and result is null.
  const result = await db
    .collection<BalanceDocument>(COLLECTIONS.BALANCE)
    .findOneAndUpdate(
      { _id: userId, amount_cents: { $gte: amountCents } },
      { $inc: { amount_cents: -amountCents } },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new BalanceError("Insufficient balance");
  }

  await recordTransaction(
    userId,
    type,
    -amountCents,
    result.amount_cents,
    refId,
  );

  return result.amount_cents;
}

/** Atomically credits a user's balance. */
export async function creditBalance(
  userId: string,
  amountCents: number,
  refId: string,
  type: TransactionType,
): Promise<number> {
  const db = await getDb();

  const incrementField =
    type === "deposit"
      ? { amount_cents: amountCents, total_deposited: amountCents }
      : type === "task_earn"
        ? { amount_cents: amountCents, total_earned: amountCents }
        : { amount_cents: amountCents };

  const result = await db
    .collection<BalanceDocument>(COLLECTIONS.BALANCE)
    .findOneAndUpdate(
      { _id: userId },
      { $inc: incrementField },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new NotFoundError("Balance");
  }

  await recordTransaction(
    userId,
    type,
    amountCents,
    result.amount_cents,
    refId,
  );

  return result.amount_cents;
}

/**
 * Atomically freezes worker earnings — credits frozen_cents (not amount_cents).
 * Also creates a frozen_earning record for maturity tracking.
 */
export async function freezeEarning(
  workerId: string,
  amountCents: number,
  taskId: string,
  maturityAt: Date,
): Promise<number> {
  const db = await getDb();

  const result = await db
    .collection<BalanceDocument>(COLLECTIONS.BALANCE)
    .findOneAndUpdate(
      { _id: workerId },
      { $inc: { frozen_cents: amountCents, total_earned: amountCents } },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new NotFoundError("Balance");
  }

  const earning: FrozenEarningDocument = {
    _id: nanoid(),
    worker_id: workerId,
    task_id: taskId,
    amount_cents: amountCents,
    frozen_at: new Date(),
    maturity_at: maturityAt,
  };
  await db.collection<FrozenEarningDocument>(COLLECTIONS.FROZEN_EARNING).insertOne(earning);

  await recordTransaction(workerId, "freeze", amountCents, result.amount_cents, taskId);

  return result.frozen_cents;
}

/**
 * Records a transaction in the ledger.
 */
async function recordTransaction(
  userId: string,
  type: TransactionType,
  amountCents: number,
  balanceAfter: number,
  refId: string | null,
): Promise<void> {
  const db = await getDb();
  const tx: TransactionDocument = {
    _id: nanoid(),
    user_id: userId,
    type,
    amount_cents: amountCents,
    balance_after: balanceAfter,
    ref_id: refId,
    created_at: new Date(),
  };
  await db.collection<TransactionDocument>(COLLECTIONS.TRANSACTION).insertOne(tx);
}

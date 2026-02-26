/**
 * Unfreeze service — moves matured frozen earnings to available balance.
 * Called by the hourly cron to release earnings past the freeze window.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS } from "@/lib/constants";
import type { BalanceDocument, FrozenEarningDocument, TransactionDocument } from "@/lib/types";
import { getDb } from "@/lib/db";

interface UnfreezeResult {
  /** Number of workers whose earnings were unfrozen. */
  workersProcessed: number;
  /** Total cents moved from frozen to available. */
  totalUnfrozen: number;
}

/**
 * Finds all frozen earnings past their maturity date and moves them to available balance.
 * Groups by worker to minimize database operations.
 *
 * @returns Summary of how many workers and cents were processed
 */
export async function unfreezeMaturedEarnings(): Promise<UnfreezeResult> {
  const db = await getDb();
  const now = new Date();

  const matured = await db
    .collection<FrozenEarningDocument>(COLLECTIONS.FROZEN_EARNING)
    .find({ maturity_at: { $lte: now } })
    .toArray();

  if (matured.length === 0) {
    return { workersProcessed: 0, totalUnfrozen: 0 };
  }

  // WHY: Group by worker to do one atomic balance update per worker
  // instead of one per frozen_earning record.
  const byWorker = new Map<string, { total: number; ids: string[] }>();
  for (const earning of matured) {
    const entry = byWorker.get(earning.worker_id) ?? { total: 0, ids: [] };
    entry.total += earning.amount_cents;
    entry.ids.push(earning._id);
    byWorker.set(earning.worker_id, entry);
  }

  let totalUnfrozen = 0;

  for (const [workerId, { total, ids }] of byWorker) {
    // WHY: Conditional update ensures frozen_cents never goes negative.
    const result = await db
      .collection<BalanceDocument>(COLLECTIONS.BALANCE)
      .findOneAndUpdate(
        { _id: workerId, frozen_cents: { $gte: total } },
        { $inc: { frozen_cents: -total, amount_cents: total } },
        { returnDocument: "after" },
      );

    if (!result) continue;

    // Remove processed frozen_earning records
    await db
      .collection<FrozenEarningDocument>(COLLECTIONS.FROZEN_EARNING)
      .deleteMany({ _id: { $in: ids } });

    // Record unfreeze transaction
    const tx: TransactionDocument = {
      _id: nanoid(),
      user_id: workerId,
      type: "unfreeze",
      amount_cents: total,
      balance_after: result.amount_cents,
      ref_id: null,
      created_at: now,
    };
    await db.collection<TransactionDocument>(COLLECTIONS.TRANSACTION).insertOne(tx);

    totalUnfrozen += total;
  }

  return { workersProcessed: byWorker.size, totalUnfrozen };
}

/**
 * Worker bind service — email and payout method bindings.
 * Separated from worker-service for single-responsibility.
 */
import { COLLECTIONS } from "@/lib/constants";
import type { WorkerDocument, WorkerPayout } from "@/lib/types";
import { getDb } from "@/lib/db";
import { NotFoundError, ConflictError } from "@/lib/errors";

/**
 * Binds an email address to a worker account.
 * Email verification flow will be implemented in Phase 9.
 *
 * @throws NotFoundError if worker doesn't exist
 * @throws ConflictError if email is already bound to another worker
 */
export async function bindWorkerEmail(
  workerId: string,
  email: string,
): Promise<void> {
  const db = await getDb();
  const collection = db.collection<WorkerDocument>(COLLECTIONS.WORKER);

  // Check if email is already used by another worker
  const existing = await collection.findOne({
    email,
    _id: { $ne: workerId },
  });
  if (existing) {
    throw new ConflictError("Email already bound to another worker");
  }

  const result = await collection.findOneAndUpdate(
    { _id: workerId },
    { $set: { email } },
    { returnDocument: "after" },
  );

  if (!result) {
    throw new NotFoundError("Worker");
  }
}

/**
 * Binds a payout method (PayPal or Solana wallet) to a worker account.
 *
 * @throws NotFoundError if worker doesn't exist
 */
export async function bindWorkerPayout(
  workerId: string,
  payout: WorkerPayout,
): Promise<void> {
  const db = await getDb();
  const result = await db
    .collection<WorkerDocument>(COLLECTIONS.WORKER)
    .findOneAndUpdate(
      { _id: workerId },
      { $set: { payout } },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new NotFoundError("Worker");
  }
}

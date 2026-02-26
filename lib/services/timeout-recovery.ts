/**
 * Timeout recovery — resets expired assigned tasks back to pending.
 * Called by Cloudflare Cron Trigger every 10 seconds.
 * Also tracks consecutive expires per worker (peeking defense).
 */
import { COLLECTIONS } from "@/lib/constants";
import type { TaskDocument, WorkerDocument } from "@/lib/types";
import { getDb } from "@/lib/db";

/** Result of a timeout recovery sweep. */
export interface RecoveryResult {
  recovered: number;
  workersPenalized: string[];
}

/**
 * Finds all assigned tasks past their deadline and resets them to pending.
 * Increments consecutive_expires for affected workers.
 *
 * @returns Number of tasks recovered and workers penalized
 */
export async function recoverExpiredTasks(): Promise<RecoveryResult> {
  const db = await getDb();
  const now = new Date();

  // Find all expired assigned tasks
  const expiredTasks = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .find({
      status: "assigned",
      deadline: { $lt: now },
    })
    .toArray();

  if (expiredTasks.length === 0) {
    return { recovered: 0, workersPenalized: [] };
  }

  const expiredIds = expiredTasks.map((t) => t._id);
  const affectedWorkerIds = [
    ...new Set(expiredTasks.map((t) => t.worker_id).filter(Boolean)),
  ] as string[];

  // Atomically reset all expired tasks to pending
  await db.collection<TaskDocument>(COLLECTIONS.TASK).updateMany(
    { _id: { $in: expiredIds }, status: "assigned" },
    {
      $set: {
        status: "pending",
        worker_id: null,
        assigned_at: null,
      },
    },
  );

  // Increment consecutive_expires and tasks_expired for affected workers
  const workersPenalized: string[] = [];
  for (const workerId of affectedWorkerIds) {
    const expireCount = expiredTasks.filter(
      (t) => t.worker_id === workerId,
    ).length;

    const worker = await db
      .collection<WorkerDocument>(COLLECTIONS.WORKER)
      .findOneAndUpdate(
        { _id: workerId },
        {
          $inc: {
            tasks_expired: expireCount,
            consecutive_expires: expireCount,
          },
        },
        { returnDocument: "after" },
      );

    // WHY: Consecutive expires threshold of 3 triggers suspension.
    // This defends against "task peeking" — claiming tasks just to read input.
    if (worker && worker.consecutive_expires >= 3) {
      const suspendUntil = new Date(now.getTime() + 3600_000); // 1 hour
      await db.collection<WorkerDocument>(COLLECTIONS.WORKER).updateOne(
        { _id: workerId },
        { $set: { suspended_until: suspendUntil } },
      );
      workersPenalized.push(workerId);
    }
  }

  return { recovered: expiredTasks.length, workersPenalized };
}

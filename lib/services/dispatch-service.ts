/**
 * Dispatch service — task claiming and result submission.
 * Uses atomic findOneAndUpdate to prevent double-claiming.
 */
import { COLLECTIONS } from "@/lib/constants";
import type {
  TaskDocument,
  TaskOutput,
  WorkerDocument,
  WorkerTier,
  WorkerTaskView,
  WorkerStats,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { NotFoundError, ConflictError, SuspendedError } from "@/lib/errors";
import { settleTaskPayment, maybeInjectSpotCheck } from "./settlement-service";
import { buildWorkerStats } from "./worker-stats";
import { compareQaResult } from "./qa-compare";

/** Result returned when a task is claimed. */
export interface ClaimResult {
  task: WorkerTaskView;
  stats: WorkerStats;
}

/** Result returned after submitting task output. */
export interface SubmitResult {
  taskId: string;
  earnedCents: number;
  stats: WorkerStats;
}

/**
 * Atomically claims the next available task matching worker preferences.
 *
 * @param worker - The authenticated worker document
 * @returns Claimed task view + stats, or null if no matching task
 * @throws SuspendedError if worker is currently suspended
 */
export async function claimNextTask(
  worker: WorkerDocument,
): Promise<ClaimResult | null> {
  if (worker.suspended_until && worker.suspended_until > new Date()) {
    throw new SuspendedError(worker.suspended_until);
  }

  const db = await getDb();
  const now = new Date();
  const filter = buildClaimFilter(worker, now);
  const sort = buildTierSort(worker.tier);

  const task = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOneAndUpdate(
      filter,
      {
        $set: {
          status: "assigned" as const,
          worker_id: worker._id,
          assigned_at: now,
        },
      },
      { sort, returnDocument: "after" },
    );

  if (!task) return null;

  await db.collection<WorkerDocument>(COLLECTIONS.WORKER).updateOne(
    { _id: worker._id },
    { $inc: { tasks_claimed: 1 } },
  );

  return {
    task: stripInternalFields(task),
    stats: await buildWorkerStats(worker, false),
  };
}

/**
 * Submits task output. Idempotent — rejects if already completed.
 * Triggers settlement (commission + worker credit) and QA injection.
 *
 * @throws NotFoundError if task doesn't exist or doesn't belong to worker
 * @throws ConflictError if task is not in 'assigned' status
 */
export async function submitTaskResult(
  worker: WorkerDocument,
  taskId: string,
  output: TaskOutput,
): Promise<SubmitResult> {
  const db = await getDb();

  const task = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOneAndUpdate(
      { _id: taskId, worker_id: worker._id, status: "assigned" },
      { $set: { status: "completed" as const, output, completed_at: new Date() } },
      { returnDocument: "before" },
    );

  if (!task) {
    return throwSubmitError(db, taskId, worker._id);
  }

  const earnedCents = await settleTaskPayment(worker, task);

  await db.collection<WorkerDocument>(COLLECTIONS.WORKER).updateOne(
    { _id: worker._id },
    {
      $inc: { tasks_completed: 1, total_earned: earnedCents },
      $set: { consecutive_expires: 0 },
    },
  );

  await maybeInjectSpotCheck(task, worker);

  // If this was a QA task, trigger comparison against the reference
  const completedTask = { ...task, output, status: "completed" as const };
  if (completedTask._internal.is_qa) {
    await compareQaResult(completedTask as TaskDocument);
  }

  return {
    taskId,
    earnedCents,
    stats: await buildWorkerStats(worker, true),
  };
}

/** Builds the MongoDB query filter for task claiming based on preferences. */
function buildClaimFilter(
  worker: WorkerDocument,
  now: Date,
): Record<string, unknown> {
  const filter: Record<string, unknown> = {
    status: "pending",
    deadline: { $gt: now },
  };

  const { preferences } = worker.profile;
  if (preferences.accept.length > 0) {
    filter.type = { $in: preferences.accept };
  }
  if (preferences.reject.length > 0) {
    const existing = (filter.type as Record<string, unknown>) ?? {};
    filter.type = { ...existing, $nin: preferences.reject };
  }
  if (preferences.min_price > 0) {
    filter.price_cents = { $gte: preferences.min_price };
  }

  return filter;
}

/**
 * Builds tier-based sort order for task claiming.
 * 20% fairness bypass randomizes sort to give all tiers a chance.
 */
function buildTierSort(tier: WorkerTier): Record<string, 1 | -1> {
  // WHY: Fairness mechanism — 20% of the time, ignore tier advantage
  const fairnessBypass = Math.random() < 0.2;

  if (fairnessBypass || tier === "new") {
    return { created_at: 1 };
  }
  if (tier === "elite" || tier === "trusted") {
    return { price_cents: -1, created_at: 1 };
  }
  return { created_at: 1 };
}

/** Strips _internal fields — workers NEVER see QA metadata. */
function stripInternalFields(task: TaskDocument): WorkerTaskView {
  return {
    id: task._id,
    type: task.type,
    input: task.input,
    constraints: task.constraints,
    price_cents: task.price_cents,
    deadline: task.deadline?.toISOString() ?? new Date().toISOString(),
  };
}

/** Throws a descriptive error when submit fails. */
async function throwSubmitError(
  db: Awaited<ReturnType<typeof getDb>>,
  taskId: string,
  workerId: string,
): Promise<never> {
  const existing = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOne({ _id: taskId });

  if (!existing || existing.worker_id !== workerId) {
    throw new NotFoundError("Task");
  }
  throw new ConflictError(
    `Task cannot be submitted (current status: ${existing.status})`,
  );
}

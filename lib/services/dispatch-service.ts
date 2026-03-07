/** Task claiming and result submission via atomic findOneAndUpdate. */
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
import { NotFoundError, ConflictError, SuspendedError, AuthError } from "@/lib/errors";
import { settleTaskPayment, maybeInjectSpotCheck } from "./settlement-service";
import { buildWorkerStats } from "./worker-stats";
import { compareQaResult } from "./qa-compare";
import { maybeInjectReview, handleReviewCompletion } from "./review-service";
import { injectEntranceExam, gradeAndPromote } from "./probation-service";
import type { ExamGradeResult } from "./probation-service";

/** Result returned when a task is claimed. */
export interface ClaimResult {
  task: WorkerTaskView;
  stats: WorkerStats;
}

/** Exam feedback included when a worker submits an entrance exam. */
export interface ExamFeedback {
  passed: boolean;
  score: number;
  total: number;
}

/** Result returned after submitting task output. */
export interface SubmitResult {
  taskId: string;
  earnedCents: number;
  stats: WorkerStats;
  exam?: ExamFeedback;
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

  const status = worker.status ?? "active";
  if (status === "suspended") {
    throw new AuthError("Worker account is suspended");
  }
  if (status === "probation") {
    return claimEntranceExam(worker);
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

  // WHY: Entrance exam tasks are free — auto-grade and maybe promote worker.
  if (task._internal.qa_type === "entrance_exam") {
    const grade = await gradeAndPromote(worker._id, taskId, output.content ?? "");
    // WHY: Re-read worker to reflect status change (probation → active) in stats.
    const freshWorker = await db
      .collection<WorkerDocument>(COLLECTIONS.WORKER)
      .findOne({ _id: worker._id });
    return {
      taskId,
      earnedCents: 0,
      stats: await buildWorkerStats(freshWorker ?? worker, false),
      exam: { passed: grade.passed, score: grade.score, total: grade.total },
    };
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
    // Supervisor review tasks produce JSON verdicts
    if (completedTask._internal.qa_type === "supervisor_review") {
      await handleReviewCompletion(completedTask as TaskDocument);
    } else {
      await compareQaResult(completedTask as TaskDocument);
    }
  } else {
    // Non-QA task: maybe inject a supervisor review
    await maybeInjectReview(completedTask as TaskDocument, worker);
  }

  return {
    taskId,
    earnedCents,
    stats: await buildWorkerStats(worker, true),
  };
}

/** Injects and atomically claims an entrance exam for a probation worker. */
async function claimEntranceExam(
  worker: WorkerDocument,
): Promise<ClaimResult | null> {
  const exam = await injectEntranceExam(worker._id);
  const db = await getDb();
  const now = new Date();

  const claimed = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOneAndUpdate(
      { _id: exam._id, status: "pending" },
      { $set: { status: "assigned" as const, worker_id: worker._id, assigned_at: now } },
      { returnDocument: "after" },
    );

  if (!claimed) {
    // Already assigned (race condition or re-poll) — return existing assigned exam
    const assigned = await db
      .collection<TaskDocument>(COLLECTIONS.TASK)
      .findOne({ _id: exam._id, worker_id: worker._id, status: "assigned" });
    if (!assigned) return null;
    return {
      task: stripInternalFields(assigned),
      stats: await buildWorkerStats(worker, false),
    };
  }

  return {
    task: stripInternalFields(claimed),
    stats: await buildWorkerStats(worker, false),
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
    // WHY: Tasks with assigned_worker_id are only visible to that worker.
    // Public tasks (null) are visible to all workers.
    $or: [
      { assigned_worker_id: null },
      { assigned_worker_id: worker._id },
    ],
  };

  const { preferences } = worker.profile;
  const typeFilter: Record<string, unknown> = {};
  if (preferences.accept.length > 0) {
    typeFilter.$in = preferences.accept;
  }
  if (preferences.reject.length > 0) {
    typeFilter.$nin = preferences.reject;
  }
  if (Object.keys(typeFilter).length > 0) {
    filter.type = typeFilter;
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

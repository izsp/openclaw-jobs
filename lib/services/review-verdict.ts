/**
 * Review verdict processing — handles supervisor review outcomes.
 * Auto-credits buyers for rejected tasks and penalizes workers.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS } from "@/lib/constants";
import type { TaskDocument, WorkerDocument, ReviewVerdict } from "@/lib/types";
import { getDb } from "@/lib/db";
import { getConfig } from "@/lib/config";
import { creditBalance } from "./balance-service";

/** Audit log entry shape (audit_log is a flexible collection). */
interface AuditLogEntry {
  _id: string;
  type: string;
  action: string;
  task_id: string;
  worker_id: string | null;
  verdict: Record<string, unknown> | null;
  created_at: Date;
}

/**
 * Processes a supervisor's review verdict after they complete a review task.
 * Handles approve/flag/reject logic including auto-credit and penalties.
 */
export async function processReviewVerdict(
  reviewTask: TaskDocument,
  verdict: ReviewVerdict,
): Promise<void> {
  const reviewConfig = await getConfig("review");
  if (!reviewConfig) return;

  const originalTaskId = reviewTask._internal.original_task_id;
  if (!originalTaskId) return;

  const db = await getDb();
  const originalTask = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOne({ _id: originalTaskId });

  if (!originalTask) return;

  await storeVerdictResult(db, reviewTask._id, verdict);

  if (verdict.verdict === "approve") return;

  if (verdict.verdict === "flag") {
    await logReviewToAudit(originalTask, verdict, "flagged");
    return;
  }

  // verdict === "reject" — auto-credit buyer + penalize worker
  if (verdict.quality_score < reviewConfig.auto_credit_threshold) {
    await autoCreditBuyer(originalTask);
  }
  if (verdict.quality_score < reviewConfig.penalty_threshold) {
    await penalizeWorker(originalTask.worker_id);
  }
  await logReviewToAudit(originalTask, verdict, "rejected");
}

/**
 * Parses supervisor review output as JSON and processes the verdict.
 * Called from dispatch-service when a supervisor_review QA task completes.
 */
export async function handleReviewCompletion(
  reviewTask: TaskDocument,
): Promise<void> {
  if (!reviewTask.output?.content) return;

  try {
    const verdict = JSON.parse(reviewTask.output.content) as ReviewVerdict;
    await processReviewVerdict(reviewTask, verdict);
  } catch {
    // WHY: If supervisor output isn't valid JSON, log and skip.
    console.error(`Failed to parse review verdict for task ${reviewTask._id}`);
  }
}

/** Maps text-level ratings to numeric scores. */
function ratingToScore(value: string, high: string, mid: string): number {
  if (value === high) return 1;
  if (value === mid) return 0.6;
  return 0.3;
}

/** Stores the verdict in the review task's _internal.qa_result. */
async function storeVerdictResult(
  db: Awaited<ReturnType<typeof getDb>>,
  reviewTaskId: string,
  verdict: ReviewVerdict,
): Promise<void> {
  await db.collection<TaskDocument>(COLLECTIONS.TASK).updateOne(
    { _id: reviewTaskId },
    {
      $set: {
        "_internal.qa_result": {
          similarity: verdict.quality_score / 100,
          dimensions: {
            relevance: ratingToScore(verdict.relevance, "high", "medium"),
            accuracy: ratingToScore(verdict.accuracy, "high", "medium"),
            presentation: ratingToScore(verdict.presentation, "good", "acceptable"),
          },
          verdict: verdict.verdict === "approve" ? "pass" : verdict.verdict,
        },
      },
    },
  );
}

/** Auto-credits the buyer for a rejected task. */
async function autoCreditBuyer(task: TaskDocument): Promise<void> {
  const db = await getDb();
  const result = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOneAndUpdate(
      { _id: task._id, status: "completed" },
      { $set: { status: "credited" as const } },
      { returnDocument: "before" },
    );

  if (result && result.buyer_id !== "platform") {
    await creditBalance(result.buyer_id, result.price_cents, result._id, "credit");
  }
}

/** Increments spot_fail counter on the worker. */
async function penalizeWorker(
  workerId: string | null,
): Promise<void> {
  if (!workerId) return;

  const db = await getDb();
  await db.collection<WorkerDocument>(COLLECTIONS.WORKER).updateOne(
    { _id: workerId },
    { $inc: { spot_fail: 1 } },
  );
}

/** Logs a review event to the audit log. */
async function logReviewToAudit(
  task: TaskDocument,
  verdict: ReviewVerdict | null,
  action: string,
): Promise<void> {
  const db = await getDb();
  const entry: AuditLogEntry = {
    _id: nanoid(),
    type: "supervisor_review",
    action,
    task_id: task._id,
    worker_id: task.worker_id,
    verdict: verdict
      ? { score: verdict.quality_score, verdict: verdict.verdict, reasoning: verdict.reasoning }
      : null,
    created_at: new Date(),
  };
  await db.collection<AuditLogEntry>(COLLECTIONS.AUDIT_LOG).insertOne(entry);
}

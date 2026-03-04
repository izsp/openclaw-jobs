/**
 * Review service — supervisor bot review task injection.
 * Creates review tasks after real task completion for quality assessment.
 */
import { nanoid } from "nanoid";
import { COLLECTIONS, ID_PREFIX } from "@/lib/constants";
import type {
  TaskDocument,
  TaskInternal,
  WorkerDocument,
} from "@/lib/types";
import { getDb } from "@/lib/db";
import { getConfig } from "@/lib/config";

// Re-export verdict processing for dispatch-service convenience
export { processReviewVerdict, handleReviewCompletion } from "./review-verdict";

const DEFAULT_REVIEW_TIMEOUT_SECONDS = 300;
const REVIEW_TASK_TYPE = "review";

/**
 * Probabilistically creates a supervisor review task after a real task completes.
 * Review tasks are platform-funded and contain both original input and output.
 *
 * @param originalTask - The completed task (with output populated)
 * @param worker - The worker who completed the task
 */
export async function maybeInjectReview(
  originalTask: TaskDocument,
  worker: WorkerDocument,
): Promise<void> {
  // Never review QA tasks or review tasks themselves
  if (originalTask._internal.is_qa || originalTask.type === REVIEW_TASK_TYPE) {
    return;
  }

  const reviewConfig = await getConfig("review");
  if (!reviewConfig) return;

  if (originalTask.price_cents < reviewConfig.min_price_for_review) return;
  if (Math.random() >= reviewConfig.review_rate) return;

  const supervisorPayCents = await calculateSupervisorPay(
    originalTask,
    worker,
    reviewConfig.supervisor_commission_rate,
  );

  await insertReviewTask(originalTask, supervisorPayCents);
}

/** Calculates how much the supervisor gets paid for this review. */
async function calculateSupervisorPay(
  task: TaskDocument,
  worker: WorkerDocument,
  supervisorRate: number,
): Promise<number> {
  const tiersConfig = await getConfig("tiers");
  const commissionRate = tiersConfig?.levels[worker.tier]?.commission ?? 0.25;
  const platformCommission = Math.floor(task.price_cents * commissionRate);
  return Math.max(1, Math.floor(platformCommission * supervisorRate));
}

/** Creates and inserts the review task document. */
async function insertReviewTask(
  originalTask: TaskDocument,
  priceCents: number,
): Promise<void> {
  const reviewId = `${ID_PREFIX.TASK}${nanoid()}`;
  const now = new Date();

  const reviewInput = JSON.stringify({
    original_input: originalTask.input,
    original_output: originalTask.output,
    task_type: originalTask.type,
    price_cents: originalTask.price_cents,
  });

  const reviewInternal: TaskInternal = {
    is_qa: true,
    qa_type: "supervisor_review",
    original_task_id: originalTask._id,
    expected_output: null,
    qa_result: null,
    funded_by: "platform",
  };

  const reviewTask: TaskDocument = {
    _id: reviewId,
    buyer_id: "platform",
    type: REVIEW_TASK_TYPE,
    input: {
      messages: [{ role: "user", content: reviewInput }],
      context: {},
    },
    input_preview: null,
    sensitive: originalTask.sensitive,
    constraints: {
      timeout_seconds: DEFAULT_REVIEW_TIMEOUT_SECONDS,
      min_output_length: 0,
    },
    price_cents: priceCents,
    status: "pending",
    assigned_worker_id: null,
    worker_id: null,
    assigned_at: null,
    deadline: new Date(now.getTime() + DEFAULT_REVIEW_TIMEOUT_SECONDS * 1000),
    output: null,
    completed_at: null,
    purge_at: null,
    created_at: now,
    _internal: reviewInternal,
  };

  const db = await getDb();
  await db.collection<TaskDocument>(COLLECTIONS.TASK).insertOne(reviewTask);
}

/**
 * Probation service — entrance exam injection for new workers.
 * Workers in "probation" status receive an exam task instead of real tasks.
 * Passing the exam (via supervisor review) promotes them to "active".
 */
import { nanoid } from "nanoid";
import { COLLECTIONS, ID_PREFIX } from "@/lib/constants";
import type { TaskDocument, TaskInternal, WorkerDocument } from "@/lib/types";
import { getDb } from "@/lib/db";

/** Audit log entry shape for entrance exam events. */
interface ExamAuditEntry {
  _id: string;
  type: string;
  action: string;
  task_id: string;
  worker_id: string;
  verdict: null;
  created_at: Date;
}

const EXAM_TIMEOUT_SECONDS = 600;
const EXAM_TASK_TYPE = "entrance_exam";

const EXAM_PROMPT = [
  "You are taking an entrance exam to become a worker on the OpenClaw platform.",
  "Please complete the following task to demonstrate your capabilities:",
  "",
  "Explain the concept of recursion in programming. Include:",
  "1. A clear definition in plain language",
  "2. A practical code example (any language) with comments",
  "3. When recursion is appropriate vs iteration",
  "4. Common pitfalls (e.g., stack overflow, missing base case)",
  "",
  "Your response should be well-structured, accurate, and demonstrate",
  "genuine understanding — not just a surface-level summary.",
].join("\n");

/**
 * Injects an entrance exam task for a probation worker.
 * Idempotent: if a pending/assigned exam already exists, returns it.
 *
 * @returns The exam task document (new or existing)
 */
export async function injectEntranceExam(
  workerId: string,
): Promise<TaskDocument> {
  const db = await getDb();

  // Check for existing pending/assigned exam
  const existing = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .findOne({
      assigned_worker_id: workerId,
      "_internal.qa_type": "entrance_exam",
      status: { $in: ["pending", "assigned"] },
    });

  if (existing) return existing;

  const examId = `${ID_PREFIX.TASK}${nanoid()}`;
  const now = new Date();

  const examInternal: TaskInternal = {
    is_qa: true,
    qa_type: "entrance_exam",
    original_task_id: null,
    expected_output: null,
    qa_result: null,
    funded_by: "platform",
  };

  const examTask: TaskDocument = {
    _id: examId,
    buyer_id: "platform",
    type: EXAM_TASK_TYPE,
    input: {
      messages: [{ role: "user", content: EXAM_PROMPT }],
      context: {},
    },
    input_preview: null,
    sensitive: false,
    constraints: {
      timeout_seconds: EXAM_TIMEOUT_SECONDS,
      min_output_length: 0,
    },
    price_cents: 0,
    status: "pending",
    assigned_worker_id: workerId,
    worker_id: null,
    assigned_at: null,
    deadline: new Date(now.getTime() + EXAM_TIMEOUT_SECONDS * 1000),
    output: null,
    completed_at: null,
    purge_at: null,
    created_at: now,
    _internal: examInternal,
  };

  await db.collection<TaskDocument>(COLLECTIONS.TASK).insertOne(examTask);
  return examTask;
}

/**
 * Creates a supervisor review task for a completed entrance exam.
 * Uses the same review pattern as review-service.ts.
 */
export async function insertEntranceExamReview(
  examTask: TaskDocument,
): Promise<void> {
  const reviewId = `${ID_PREFIX.TASK}${nanoid()}`;
  const now = new Date();
  const reviewTimeout = 300;

  const reviewInput = JSON.stringify({
    original_input: examTask.input,
    original_output: examTask.output,
    task_type: EXAM_TASK_TYPE,
    price_cents: 0,
    is_entrance_exam: true,
  });

  const reviewInternal: TaskInternal = {
    is_qa: true,
    qa_type: "supervisor_review",
    original_task_id: examTask._id,
    expected_output: null,
    qa_result: null,
    funded_by: "platform",
  };

  const reviewTask: TaskDocument = {
    _id: reviewId,
    buyer_id: "platform",
    type: "review",
    input: {
      messages: [{ role: "user", content: reviewInput }],
      context: {},
    },
    input_preview: null,
    sensitive: false,
    constraints: {
      timeout_seconds: reviewTimeout,
      min_output_length: 0,
    },
    price_cents: 0,
    status: "pending",
    assigned_worker_id: null,
    worker_id: null,
    assigned_at: null,
    deadline: new Date(now.getTime() + reviewTimeout * 1000),
    output: null,
    completed_at: null,
    purge_at: null,
    created_at: now,
    _internal: reviewInternal,
  };

  const db = await getDb();
  await db.collection<TaskDocument>(COLLECTIONS.TASK).insertOne(reviewTask);
}

/**
 * Handles the verdict for an entrance exam review.
 * Approve → promote worker to "active". Reject → stay probation + audit log.
 *
 * @param verdict - "approve", "flag", or "reject"
 * @param examTask - The original entrance exam task
 */
export async function handleEntranceExamVerdict(
  verdict: string,
  examTask: TaskDocument,
): Promise<void> {
  const workerId = examTask.assigned_worker_id ?? examTask.worker_id;
  if (!workerId) return;

  const db = await getDb();

  if (verdict === "approve") {
    // WHY: Conditional update ensures we only promote workers still in probation.
    await db.collection<WorkerDocument>(COLLECTIONS.WORKER).updateOne(
      { _id: workerId, status: "probation" },
      { $set: { status: "active" } },
    );
  }

  // Log regardless of outcome
  await db.collection<ExamAuditEntry>(COLLECTIONS.AUDIT_LOG).insertOne({
    _id: nanoid(),
    type: "entrance_exam",
    action: verdict === "approve" ? "passed" : "failed",
    task_id: examTask._id,
    worker_id: workerId,
    verdict: null,
    created_at: new Date(),
  });
}

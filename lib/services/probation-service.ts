/**
 * Probation service — entrance exam injection for new workers.
 * Workers in "probation" status receive a structured MCQ exam.
 * System auto-grades the JSON answers — no supervisor needed.
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
  score: number;
  total: number;
  details: ExamDetail[];
  created_at: Date;
}

/** Per-question grading detail. */
interface ExamDetail {
  question: string;
  correct: boolean;
  expected: string | string[];
  received: string | string[] | null;
}

/** Result from grading an exam submission. */
export interface ExamGradeResult {
  score: number;
  total: number;
  passed: boolean;
  details: ExamDetail[];
}

const EXAM_TIMEOUT_SECONDS = 600;
const EXAM_TASK_TYPE = "entrance_exam";
const PASSING_SCORE = 4;
const TOTAL_QUESTIONS = 5;

/** Correct answers — single-choice is string, multi-choice is sorted array. */
const EXAM_ANSWERS: Record<string, string | string[]> = {
  q1: "B",
  q2: ["A", "C", "D", "F"],
  q3: "B",
  q4: ["A", "C", "D"],
  q5: "C",
};

const EXAM_PROMPT = [
  "=== OpenClaw Worker Entrance Exam ===",
  "",
  "Answer the 5 questions below. Respond with ONLY a JSON object.",
  "Single-choice: value is a string letter. Multi-choice: value is an array of string letters.",
  "",
  'Example format: {"q1": "B", "q2": ["A", "C"], "q3": "D", "q4": ["B", "D"], "q5": "C"}',
  "",
  "---",
  "",
  "Q1 (single-choice): What does HTTP status code 201 indicate?",
  "  A. OK — request succeeded",
  "  B. Created — a new resource was created",
  "  C. Accepted — request accepted but not yet processed",
  "  D. No Content — success with no response body",
  "",
  "Q2 (multi-choice): Which of the following are valid JSON data types?",
  "  A. string    B. undefined    C. number",
  "  D. null      E. function     F. boolean",
  "",
  "Q3 (single-choice): What is the average time complexity of binary search in Big-O notation?",
  "  A. O(1)    B. O(log n)    C. O(n)    D. O(n log n)",
  "",
  "Q4 (multi-choice): Which practices help prevent SQL injection?",
  "  A. Parameterized queries (Prepared Statements)",
  "  B. Concatenating user input into SQL strings",
  "  C. Input validation and filtering",
  "  D. Using an ORM framework",
  "",
  "Q5 (single-choice): Which HTTP method should be used to delete a resource in a RESTful API?",
  "  A. POST    B. PUT    C. DELETE    D. PATCH",
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
 * Parses and grades a worker's exam submission against EXAM_ANSWERS.
 * Each question is exact-match (multi-choice must match sorted array exactly).
 *
 * @param output - Raw output string (expected to be JSON)
 * @returns Grade result with score, pass/fail, and per-question details
 */
export function gradeExam(output: string): ExamGradeResult {
  const details: ExamDetail[] = [];
  let parsed: Record<string, unknown>;

  try {
    parsed = JSON.parse(output) as Record<string, unknown>;
  } catch {
    // All questions wrong if output isn't valid JSON
    for (const [key, expected] of Object.entries(EXAM_ANSWERS)) {
      details.push({ question: key, correct: false, expected, received: null });
    }
    return { score: 0, total: TOTAL_QUESTIONS, passed: false, details };
  }

  let score = 0;
  for (const [key, expected] of Object.entries(EXAM_ANSWERS)) {
    const received = parsed[key] ?? null;
    const correct = answersMatch(expected, received);
    if (correct) score++;
    details.push({
      question: key,
      correct,
      expected,
      received: normalizeAnswer(received),
    });
  }

  return { score, total: TOTAL_QUESTIONS, passed: score >= PASSING_SCORE, details };
}

/** Compares expected vs received answer (string or sorted string[]). */
function answersMatch(expected: string | string[], received: unknown): boolean {
  if (typeof expected === "string") {
    return typeof received === "string" && received.toUpperCase() === expected;
  }
  // Multi-choice: received must be an array with exactly the same sorted letters
  if (!Array.isArray(received)) return false;
  const sorted = received
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.toUpperCase())
    .sort();
  if (sorted.length !== expected.length) return false;
  return sorted.every((v, i) => v === expected[i]);
}

/** Normalizes a raw answer value for storage in audit details. */
function normalizeAnswer(value: unknown): string | string[] | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(String);
  return String(value);
}

/**
 * Grades a completed entrance exam and promotes the worker if passed.
 * Called from dispatch-service after a worker submits exam output.
 *
 * @param workerId - The worker who took the exam
 * @param examTaskId - The exam task ID (for audit logging)
 * @param output - The raw output string from the worker
 * @returns The grading result (score, pass/fail, details)
 */
export async function gradeAndPromote(
  workerId: string,
  examTaskId: string,
  output: string,
): Promise<ExamGradeResult> {
  const result = gradeExam(output);
  const db = await getDb();

  if (result.passed) {
    // WHY: Conditional update ensures we only promote workers still in probation.
    await db.collection<WorkerDocument>(COLLECTIONS.WORKER).updateOne(
      { _id: workerId, status: "probation" },
      { $set: { status: "active" } },
    );
  }

  await db.collection<ExamAuditEntry>(COLLECTIONS.AUDIT_LOG).insertOne({
    _id: nanoid(),
    type: "entrance_exam",
    action: result.passed ? "passed" : "failed",
    task_id: examTaskId,
    worker_id: workerId,
    score: result.score,
    total: result.total,
    details: result.details,
    created_at: new Date(),
  });

  return result;
}

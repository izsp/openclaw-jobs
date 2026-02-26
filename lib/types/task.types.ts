import type { TASK_STATUSES, QA_TYPES } from "@/lib/constants";

/** Task status literal derived from constants. */
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** QA type literal derived from constants. */
export type QaType = (typeof QA_TYPES)[number];

/** QA verdict after comparison. */
export type QaVerdict = "pass" | "flag" | "fail";

/** Who funds this task. */
export type TaskFunder = "buyer" | "platform";

/** Task execution constraints sent to workers. */
export interface TaskConstraints {
  timeout_seconds: number;
  min_output_length: number;
}

/** Internal QA metadata — NEVER exposed to workers. */
export interface TaskInternal {
  is_qa: boolean;
  qa_type: QaType | null;
  original_task_id: string | null;
  expected_output: Record<string, unknown> | null;
  qa_result: QaResult | null;
  funded_by: TaskFunder;
}

/** Result of a QA comparison. */
export interface QaResult {
  similarity: number;
  dimensions: Record<string, number>;
  verdict: QaVerdict;
}

/** MongoDB document shape for the `task` collection. */
export interface TaskDocument {
  _id: string;
  buyer_id: string;
  type: string;
  input: TaskInput;
  input_preview: Record<string, unknown> | null;
  sensitive: boolean;
  constraints: TaskConstraints;
  price_cents: number;
  status: TaskStatus;
  worker_id: string | null;
  assigned_at: Date | null;
  deadline: Date | null;
  output: TaskOutput | null;
  completed_at: Date | null;
  purge_at: Date | null;
  created_at: Date;
  _internal: TaskInternal;
}

/** Task input payload from buyer. */
export interface TaskInput {
  messages: Array<{ role: string; content: string }>;
  context: Record<string, unknown>;
}

/** Task output payload from worker. */
export interface TaskOutput {
  content: string;
  format: string;
}

/**
 * Task fields visible to workers via /work/next.
 * _internal is ALWAYS stripped.
 */
export interface WorkerTaskView {
  id: string;
  type: string;
  input: TaskInput;
  constraints: TaskConstraints;
  price_cents: number;
  deadline: string;
}

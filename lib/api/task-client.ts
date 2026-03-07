/**
 * Frontend API client for task operations.
 */
import { fetchApi } from "./fetch-api";

export interface SubmitTaskInput {
  type: string;
  input: {
    messages: Array<{ role: string; content: string }>;
    context?: Record<string, unknown>;
  };
  sensitive?: boolean;
  constraints?: Record<string, unknown>;
  input_preview?: Record<string, unknown> | null;
  assigned_worker_id?: string;
}

export interface SubmitTaskResult {
  task_id: string;
  price_cents: number;
  balance_after_cents: number;
  deadline: string;
}

export interface TaskOutputAttachment {
  s3_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

export interface TaskOutput {
  content: string;
  format: string;
  attachments?: TaskOutputAttachment[];
}

export interface TaskStatus {
  task_id: string;
  status: string;
  type: string;
  price_cents: number;
  output: TaskOutput | null;
  completed_at: string | null;
  created_at: string;
  worker_id?: string | null;
  worker_display_name?: string | null;
  worker_avatar_url?: string | null;
}

export interface CreditResult {
  balance_after_cents: number;
}

/** Submits a new task to the worker network. */
export async function submitTask(input: SubmitTaskInput): Promise<SubmitTaskResult> {
  return fetchApi<SubmitTaskResult>("/api/task", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Fetches the status and result of a task. */
export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  return fetchApi<TaskStatus>(`/api/task/${encodeURIComponent(taskId)}`);
}

/** Requests auto-credit for a completed task. */
export async function creditTask(taskId: string): Promise<CreditResult> {
  return fetchApi<CreditResult>(`/api/task/${encodeURIComponent(taskId)}/credit`, {
    method: "POST",
  });
}

/** Cancels a pending or assigned task. Returns updated balance. */
export async function cancelTask(taskId: string): Promise<CreditResult> {
  return fetchApi<CreditResult>(`/api/task/${encodeURIComponent(taskId)}/cancel`, {
    method: "POST",
  });
}

/**
 * Frontend API client for task operations.
 */
import { fetchApi } from "./fetch-api";

export interface SubmitTaskInput {
  type: string;
  input: string;
  sensitive?: boolean;
  constraints?: Record<string, unknown>;
  input_preview?: string;
}

export interface SubmitTaskResult {
  task_id: string;
  price_cents: number;
  balance_after_cents: number;
  deadline: string;
}

export interface TaskStatus {
  task_id: string;
  status: string;
  type: string;
  price_cents: number;
  output: string | null;
  completed_at: string | null;
  created_at: string;
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

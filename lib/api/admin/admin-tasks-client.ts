"use client";

import { adminGet, adminPost } from "./admin-fetch";
import type { TaskDocument } from "@/lib/types/task.types";

export interface AdminTaskListParams {
  page?: string;
  limit?: string;
  status?: string;
  is_qa?: string;
}

export interface AdminTaskListResult {
  items: TaskDocument[];
  total: number;
  page: number;
  total_pages: number;
}

/** List tasks with pagination and filters. */
export function listTasks(params: AdminTaskListParams): Promise<AdminTaskListResult> {
  return adminGet("/api/admin/tasks", params as Record<string, string>);
}

/** Get a single task with full details including _internal. */
export function getTask(id: string): Promise<TaskDocument> {
  return adminGet(`/api/admin/tasks/${encodeURIComponent(id)}`);
}

/** Retry a failed task. */
export function retryTask(id: string): Promise<{ task_id: string }> {
  return adminPost(`/api/admin/tasks/${encodeURIComponent(id)}/retry`, {});
}

/** Credit a completed task back to the buyer. */
export function creditTask(id: string): Promise<{ balance_after: number }> {
  return adminPost(`/api/admin/tasks/${encodeURIComponent(id)}/credit`, {});
}

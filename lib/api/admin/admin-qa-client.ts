"use client";

import { adminGet } from "./admin-fetch";
import type { TaskDocument } from "@/lib/types/task.types";

export interface QaTaskListParams {
  page?: string;
  limit?: string;
  qa_type?: string;
  verdict?: string;
}

export interface QaTaskListResult {
  items: TaskDocument[];
  total: number;
  page: number;
  total_pages: number;
}

export interface QaStats {
  total_qa_tasks: number;
  pass_count: number;
  fail_count: number;
  flag_count: number;
  pass_rate: number;
}

/** List QA tasks with filters. */
export function listQaTasks(params: QaTaskListParams): Promise<QaTaskListResult> {
  return adminGet("/api/admin/qa/tasks", params as Record<string, string>);
}

/** Get aggregate QA statistics. */
export function getQaStats(): Promise<QaStats> {
  return adminGet("/api/admin/qa/stats");
}

"use client";

import { adminGet, adminPatch } from "./admin-fetch";
import type { WorkerDocument, WorkerTier, WorkerStatus } from "@/lib/types/worker.types";

export interface AdminWorkerListParams {
  page?: string;
  limit?: string;
  search?: string;
  tier?: string;
  status?: string;
}

export interface AdminWorkerListResult {
  items: WorkerDocument[];
  total: number;
  page: number;
  total_pages: number;
}

export interface UpdateWorkerBody {
  tier?: WorkerTier;
  status?: WorkerStatus;
}

/** List workers with pagination and filters. */
export function listWorkers(params: AdminWorkerListParams): Promise<AdminWorkerListResult> {
  return adminGet("/api/admin/workers", params as Record<string, string>);
}

/** Get a single worker's full details. */
export function getWorker(id: string): Promise<WorkerDocument> {
  return adminGet(`/api/admin/workers/${encodeURIComponent(id)}`);
}

/** Update a worker's tier or status. */
export function updateWorker(id: string, body: UpdateWorkerBody): Promise<WorkerDocument> {
  return adminPatch(`/api/admin/workers/${encodeURIComponent(id)}`, body);
}

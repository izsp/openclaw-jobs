"use client";

import { adminGet } from "./admin-fetch";

export interface AuditEntry {
  _id: string;
  type: string;
  action: string;
  actor: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditListParams {
  page?: string;
  limit?: string;
  type?: string;
  action?: string;
  from?: string;
  to?: string;
}

export interface AuditListResult {
  items: AuditEntry[];
  total: number;
  page: number;
  total_pages: number;
}

/** List audit log entries with filters. */
export function listAuditEntries(params: AuditListParams): Promise<AuditListResult> {
  return adminGet("/api/admin/audit", params as Record<string, string>);
}

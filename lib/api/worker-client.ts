/**
 * Frontend API client for worker dashboard operations.
 * Workers authenticate via Bearer token stored in sessionStorage.
 */
import { fetchApi } from "./fetch-api";

const TOKEN_KEY = "openclaw_worker_token";
const WORKER_ID_KEY = "openclaw_worker_id";

/** Saves worker credentials to sessionStorage. */
export function saveWorkerCredentials(workerId: string, token: string): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  sessionStorage.setItem(WORKER_ID_KEY, workerId);
  sessionStorage.setItem(TOKEN_KEY, token);
}

/** Loads the worker token from sessionStorage. */
export function getWorkerToken(): string | null {
  if (typeof globalThis.sessionStorage === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

/** Loads the worker ID from sessionStorage. */
export function getWorkerId(): string | null {
  if (typeof globalThis.sessionStorage === "undefined") return null;
  return sessionStorage.getItem(WORKER_ID_KEY);
}

/** Clears worker credentials. */
export function clearWorkerCredentials(): void {
  if (typeof globalThis.sessionStorage === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(WORKER_ID_KEY);
}

function workerHeaders(): HeadersInit {
  const token = getWorkerToken();
  if (!token) throw new Error("Worker not authenticated");
  return { Authorization: `Bearer ${token}` };
}

// ── Response Types ──

export interface WorkerStats {
  tasks_completed: number;
  completion_rate: number;
  credit_request_rate: number;
  tier: "new" | "proven" | "trusted" | "elite";
  tier_changed: boolean;
  next_tier: string | null;
  next_tier_requires: TierRequirements | null;
  earnings_today: number;
  total_earned: number;
}

export interface TierRequirements {
  min_tasks: number;
  min_completion_rate: number;
  max_credit_rate: number;
  tasks_remaining: number;
  completion_rate_met: boolean;
  credit_rate_met: boolean;
}

export interface ConnectResult {
  worker_id: string;
  token: string;
  stats: WorkerStats;
}

export interface WorkerProfile {
  preferences: Record<string, unknown>;
  schedule: Record<string, unknown>;
  limits: Record<string, unknown>;
}

export interface PayoutInfo {
  method: "paypal" | "solana";
  address: string;
}

export interface WithdrawResult {
  amount_cents: number;
  balance_after: number;
  payout_status: string;
}

// ── API Functions ──

/** Registers a new worker. Returns credentials (show token ONCE). */
export async function connectWorker(workerType: string): Promise<ConnectResult> {
  return fetchApi<ConnectResult>("/api/worker/connect", {
    method: "POST",
    body: JSON.stringify({ worker_type: workerType }),
  });
}

/** Updates worker profile (preferences, schedule, limits). */
export async function updateProfile(
  profile: Partial<{ preferences: Record<string, unknown>; schedule: Record<string, unknown>; limits: Record<string, unknown> }>,
): Promise<{ profile: WorkerProfile }> {
  return fetchApi<{ profile: WorkerProfile }>("/api/worker/profile", {
    method: "PATCH",
    headers: workerHeaders(),
    body: JSON.stringify(profile),
  });
}

/** Binds an email to the worker account. */
export async function bindEmail(email: string): Promise<{ email: string }> {
  return fetchApi<{ email: string }>("/api/worker/bind-email", {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify({ email }),
  });
}

/** Binds a payout method (PayPal or Solana). */
export async function bindPayout(method: string, address: string): Promise<{ payout: PayoutInfo }> {
  return fetchApi<{ payout: PayoutInfo }>("/api/worker/bind-payout", {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify({ method, address }),
  });
}

/** Requests a withdrawal from available balance. */
export async function requestWithdrawal(amountCents: number): Promise<WithdrawResult> {
  return fetchApi<WithdrawResult>("/api/worker/withdraw", {
    method: "POST",
    headers: workerHeaders(),
    body: JSON.stringify({ amount_cents: amountCents }),
  });
}

export interface WorkerMeData {
  worker_id: string;
  worker_type: string;
  email: string | null;
  payout: PayoutInfo | null;
  tier: string;
  stats: WorkerStats;
  balance: {
    amount_cents: number;
    frozen_cents: number;
    total_earned: number;
    total_withdrawn: number;
  };
  created_at: string;
}

/** Fetches the authenticated worker's full profile. */
export async function getWorkerMe(): Promise<WorkerMeData> {
  return fetchApi<WorkerMeData>("/api/worker/me", {
    headers: workerHeaders(),
  });
}

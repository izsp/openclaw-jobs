// ─── Collection Names ────────────────────────────────────────────────────────
export const COLLECTIONS = {
  USER: "user",
  BALANCE: "balance",
  TRANSACTION: "transaction",
  TASK: "task",
  WORKER: "worker",
  AUDIT_LOG: "audit_log",
  PLATFORM_CONFIG: "platform_config",
  FROZEN_EARNING: "frozen_earning",
} as const;

// ─── ID Prefixes ─────────────────────────────────────────────────────────────
export const ID_PREFIX = {
  TASK: "task_",
  WORKER: "w_",
  TOKEN: "ocj_w_",
} as const;

// ─── Worker Tiers ────────────────────────────────────────────────────────────
export const WORKER_TIERS = ["new", "proven", "trusted", "elite"] as const;

// ─── Task Statuses ───────────────────────────────────────────────────────────
export const TASK_STATUSES = [
  "pending",
  "assigned",
  "completed",
  "failed",
  "credited",
] as const;

// ─── Transaction Types ───────────────────────────────────────────────────────
export const TRANSACTION_TYPES = [
  "deposit",
  "task_pay",
  "task_earn",
  "withdraw",
  "freeze",
  "unfreeze",
  "credit",
] as const;

// ─── Auth Providers ──────────────────────────────────────────────────────────
export const AUTH_PROVIDERS = [
  "cognito",
] as const;

// ─── User Roles ──────────────────────────────────────────────────────────────
export const USER_ROLES = ["buyer", "seller", "both"] as const;

// ─── QA Types ────────────────────────────────────────────────────────────────
export const QA_TYPES = ["spot_check", "shadow", "benchmark", "supervisor_review"] as const;

// ─── Platform Config Keys ────────────────────────────────────────────────────
export const CONFIG_KEYS = [
  "pricing",
  "tiers",
  "commissions",
  "signup",
  "qa",
  "rate_limits",
  "review",
] as const;

// ─── Currency ────────────────────────────────────────────────────────────────
/** 100 🦐 = $1.00 USD */
export const SHRIMP_PER_DOLLAR = 100;

// ─── HTTP ────────────────────────────────────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ─── Token ───────────────────────────────────────────────────────────────────
export const TOKEN_BYTE_LENGTH = 32;

// ─── Payload Limits (bytes) ──────────────────────────────────────────────────
export const PAYLOAD_LIMITS = {
  WORKER_CONNECT: 16 * 1024,
  TASK_INPUT: 128 * 1024,
  WORK_SUBMIT: 256 * 1024,
  WORKER_PROFILE: 8 * 1024,
  /** Small payloads: deposit, bind-email, bind-payout, withdrawal */
  SMALL_BODY: 4 * 1024,
} as const;

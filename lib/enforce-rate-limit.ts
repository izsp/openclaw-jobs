/**
 * Rate limit enforcement for API route handlers.
 * Reads limits from platform_config and enforces via in-memory sliding window.
 */
import { getConfig } from "@/lib/config";
import { checkRateLimit } from "@/lib/services/rate-limiter";
import { extractIp } from "@/lib/extract-ip";
import { RateLimitError } from "@/lib/errors";
import type { RateLimitRule } from "@/lib/types/config.types";

/** One minute in milliseconds. */
const ONE_MINUTE_MS = 60_000;

/** Default rate limits when config is unavailable. */
const DEFAULTS: Record<string, RateLimitRule> = {
  registration: { per_ip_per_min: 3 },
  work_next: { per_ip_per_min: 30 },
  task_submit: { per_min: 20 },
  work_submit: { per_min: 30 },
  deposit: { per_ip_per_min: 10 },
  withdrawal: { per_ip_per_min: 5 },
  balance_check: { per_ip_per_min: 30 },
  task_check: { per_ip_per_min: 30 },
  worker_me: { per_ip_per_min: 20 },
};

/**
 * Enforces IP-based rate limiting for a request.
 * @param request - The incoming HTTP request
 * @param operation - The rate limit category (must match a key in config:rate_limits)
 * @throws RateLimitError if limit exceeded
 */
export async function enforceRateLimit(
  request: Request,
  operation: string,
): Promise<void> {
  const config = await getConfig("rate_limits");
  const rule =
    (config as Record<string, RateLimitRule> | null)?.[operation] ??
    DEFAULTS[operation];
  if (!rule) return;

  const ip = extractIp(request);
  const limit = rule.per_ip_per_min ?? rule.per_min ?? 60;

  const result = checkRateLimit(operation, ip, limit, ONE_MINUTE_MS);
  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded for ${operation}. Retry after ${Math.ceil(result.resetMs / 1000)}s`,
    );
  }
}

/**
 * Enforces token-based rate limiting for authenticated worker requests.
 * Uses the worker's token hash as the identifier.
 * @param tokenHash - SHA-256 hash of the worker's bearer token
 * @param operation - The rate limit category
 * @throws RateLimitError if limit exceeded
 */
export async function enforceWorkerRateLimit(
  tokenHash: string,
  operation: string,
): Promise<void> {
  const config = await getConfig("rate_limits");
  const rule =
    (config as Record<string, RateLimitRule> | null)?.[operation] ??
    DEFAULTS[operation];
  if (!rule) return;

  const limit = rule.established_per_min ?? rule.per_min ?? 30;

  const result = checkRateLimit(
    `${operation}:token`,
    tokenHash,
    limit,
    ONE_MINUTE_MS,
  );
  if (!result.allowed) {
    throw new RateLimitError(
      `Rate limit exceeded. Retry after ${Math.ceil(result.resetMs / 1000)}s`,
    );
  }
}

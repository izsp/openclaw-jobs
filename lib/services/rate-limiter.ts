/**
 * In-memory sliding window rate limiter.
 * Tracks request counts per key (IP or token) within a configurable window.
 *
 * Limitations: in-memory state is per-instance, so on Cloudflare Workers
 * each isolate has its own counters. For stricter enforcement, upgrade to
 * Cloudflare KV or Durable Objects. This still prevents burst abuse within
 * a single isolate and is effective for single-instance dev/staging.
 */

/** Result of a rate limit check. */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

interface BucketEntry {
  timestamps: number[];
}

/** Global store keyed by "operation:identifier". */
const store = new Map<string, BucketEntry>();

/** How often to purge expired entries (ms). */
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

/**
 * Checks and records a request against the rate limit.
 * @param operation - The rate limit category (e.g. "registration", "task_submit")
 * @param identifier - The client identifier (IP address or worker token hash)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Whether the request is allowed
 */
export function checkRateLimit(
  operation: string,
  identifier: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  maybeCleanup(windowMs);

  const key = `${operation}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length >= maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + windowMs - now;
    return { allowed: false, remaining: 0, resetMs: Math.max(resetMs, 0) };
  }

  entry.timestamps.push(now);
  const remaining = maxRequests - entry.timestamps.length;
  return { allowed: true, remaining, resetMs: windowMs };
}

/** Periodically purge stale entries to prevent memory leaks. */
function maybeCleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

/**
 * Resets rate limit state for a specific key. Useful in tests.
 */
export function resetRateLimit(operation: string, identifier: string): void {
  store.delete(`${operation}:${identifier}`);
}

/** Clears all rate limit state. Useful in tests. */
export function resetAllRateLimits(): void {
  store.clear();
}

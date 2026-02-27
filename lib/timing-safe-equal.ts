/**
 * Timing-safe string comparison to prevent timing attacks on secret tokens.
 * Wraps crypto.timingSafeEqual with string-to-buffer conversion.
 */
import { timingSafeEqual } from "crypto";

/**
 * Compares two strings in constant time.
 * Returns false immediately if lengths differ (length is not secret).
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

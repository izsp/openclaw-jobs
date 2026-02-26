/**
 * Generates a unique request ID for API tracing.
 */
import { nanoid } from "nanoid";

/** Returns a short unique request ID for logging and error responses. */
export function generateRequestId(): string {
  return nanoid(12);
}

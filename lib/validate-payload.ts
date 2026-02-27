/**
 * Request payload size validation.
 * Reads the raw body and enforces byte-level size limits before JSON parsing.
 */
import { PayloadTooLargeError, ValidationError } from "@/lib/errors";

/**
 * Reads and parses the request body, rejecting payloads above the byte limit.
 * @param request - The incoming HTTP request
 * @param maxBytes - Maximum allowed body size in bytes
 * @returns Parsed JSON body
 * @throws PayloadTooLargeError if body exceeds maxBytes
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  // Check Content-Length header first (fast path)
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }

  // Read body as text to measure actual size
  const text = await request.text();
  const byteLength = new TextEncoder().encode(text).byteLength;
  if (byteLength > maxBytes) {
    throw new PayloadTooLargeError(maxBytes);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError("Invalid JSON body");
  }
}

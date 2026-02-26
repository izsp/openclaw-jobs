/**
 * Admin authentication for protected API routes.
 * Uses a shared secret (ADMIN_SECRET env var) via Bearer token.
 */
import { AuthError } from "@/lib/errors";

/**
 * Verifies that the request carries a valid admin Bearer token.
 *
 * @throws AuthError if ADMIN_SECRET is not configured or token doesn't match
 */
export function verifyAdminAuth(request: Request): void {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new AuthError("Admin authentication is not configured");
  }

  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new AuthError("Missing admin authorization header");
  }

  const token = header.slice(7);
  if (token !== secret) {
    throw new AuthError("Invalid admin token");
  }
}

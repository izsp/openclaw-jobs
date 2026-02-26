/**
 * Worker authentication helper for API routes.
 * Extracts Bearer token from Authorization header and authenticates via hash.
 */
import type { WorkerDocument } from "@/lib/types";
import { AuthError } from "@/lib/errors";
import { authenticateWorker } from "@/lib/services/worker-service";

/**
 * Extracts and authenticates a worker from the request's Authorization header.
 *
 * @param request - The incoming Next.js request
 * @returns The authenticated worker document
 * @throws AuthError if no Bearer token or token is invalid
 */
export async function requireWorkerAuth(
  request: Request,
): Promise<WorkerDocument> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing worker token");
  }

  const rawToken = authHeader.slice(7);
  if (!rawToken) {
    throw new AuthError("Empty worker token");
  }

  return authenticateWorker(rawToken);
}

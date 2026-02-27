/**
 * Shared API route handler utilities.
 * Provides auth helpers and error formatting for route handlers.
 *
 * WHY no top-level auth import: On Cloudflare Workers, importing next-auth
 * at module load time causes the Worker to hang. We use a dynamic import
 * inside requireAuth() so only routes that need authentication pay the cost.
 */
import { NextResponse } from "next/server";
import { AppError, AuthError } from "@/lib/errors";
import { errorResponse } from "@/lib/types/api.types";
import { generateRequestId } from "@/lib/request-id";
import { logError } from "@/lib/logger";

/**
 * Extracts the authenticated user ID from the session.
 * @throws AuthError if not authenticated
 */
export async function requireAuth(): Promise<{ userId: string }> {
  // WHY dynamic import: next-auth causes Workers to hang when imported
  // at module level. Lazy-loading avoids this for routes that don't need auth.
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Sign in required");
  }
  return { userId: session.user.id };
}

/**
 * Catches errors and returns a structured JSON response.
 * Used at the top level of every route handler.
 */
export function handleApiError(
  error: unknown,
  requestId: string,
): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      errorResponse(error.message, error.code, requestId),
      { status: error.statusCode },
    );
  }

  const errMsg = error instanceof Error ? error.message : "Unknown error";
  logError(`Unexpected error: ${errMsg}`, {
    request_id: requestId,
    error_code: "INTERNAL_ERROR",
  });
  // TODO: Remove debug_message before production — exposes internal errors
  return NextResponse.json(
    {
      ...errorResponse("Internal server error", "INTERNAL_ERROR", requestId),
      debug_message: errMsg,
      debug_stack: error instanceof Error ? error.stack?.split("\n").slice(0, 5) : undefined,
    },
    { status: 500 },
  );
}

/** Creates a request ID. Re-exported for convenience. */
export { generateRequestId };

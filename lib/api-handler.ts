/**
 * Shared API route handler utilities.
 * Provides auth helpers and error formatting for route handlers.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { AppError, AuthError } from "@/lib/errors";
import { errorResponse } from "@/lib/types/api.types";
import { generateRequestId } from "@/lib/request-id";

/**
 * Extracts the authenticated user ID from the session.
 * @throws AuthError if not authenticated
 */
export async function requireAuth(): Promise<{ userId: string }> {
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

  console.error(`[${requestId}] Unexpected error:`, error);
  return NextResponse.json(
    errorResponse("Internal server error", "INTERNAL_ERROR", requestId),
    { status: 500 },
  );
}

/** Creates a request ID. Re-exported for convenience. */
export { generateRequestId };

/**
 * Shared API route handler utilities.
 * Provides auth helpers and error formatting for route handlers.
 */
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { AppError, AuthError } from "@/lib/errors";
import { errorResponse } from "@/lib/types/api.types";
import { generateRequestId } from "@/lib/request-id";
import { logError } from "@/lib/logger";

/**
 * Extracts the authenticated user ID from the JWT in the request cookie.
 * Uses getToken() from next-auth/jwt to read the JWT directly from the
 * request headers, which is more explicit than the auth() helper.
 *
 * @param request - The incoming HTTP request (required for cookie reading)
 * @throws AuthError if not authenticated
 */
export async function requireAuth(
  request: Request,
): Promise<{ userId: string }> {
  const secret =
    process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";

  // WHY: On HTTPS, Auth.js sets cookies with __Secure- prefix.
  // getToken must know this to look for the correct cookie name.
  // Locally (http://localhost), no prefix is used.
  const secureCookie = request.url.startsWith("https://");

  const token = await getToken({ req: request, secret, secureCookie });

  if (!token?.userId) {
    throw new AuthError("Sign in required");
  }
  return { userId: token.userId as string };
}

/** Headers that prevent CDN/browser caching of API responses. */
const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
} as const;

/**
 * Catches errors and returns a structured JSON response.
 * Used at the top level of every route handler.
 * All error responses include no-cache headers to prevent CDN caching.
 */
export function handleApiError(
  error: unknown,
  requestId: string,
): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      errorResponse(error.message, error.code, requestId),
      { status: error.statusCode, headers: NO_CACHE_HEADERS },
    );
  }

  const errMsg = error instanceof Error ? error.message : "Unknown error";
  logError(`Unexpected error: ${errMsg}`, {
    request_id: requestId,
    error_code: "INTERNAL_ERROR",
  });
  return NextResponse.json(
    errorResponse("Internal server error", "INTERNAL_ERROR", requestId),
    { status: 500, headers: NO_CACHE_HEADERS },
  );
}

/**
 * Creates a JSON response with no-cache headers.
 * Use in route handlers for all success responses to prevent CDN caching.
 */
export function jsonResponse(
  data: unknown,
  init?: { status?: number },
): NextResponse {
  return NextResponse.json(data, {
    ...init,
    headers: NO_CACHE_HEADERS,
  });
}

/** Creates a request ID. Re-exported for convenience. */
export { generateRequestId };

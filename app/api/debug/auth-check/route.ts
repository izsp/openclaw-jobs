/**
 * GET /api/debug/auth-check — Diagnose auth issues in request context.
 * Visit this URL in the browser while logged in to see exactly what auth() returns.
 * TODO: Remove before production launch.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result: Record<string, unknown> = {};

  // WHY: On HTTPS (Workers), Auth.js uses __Secure- cookie prefix.
  // On HTTP (localhost), no prefix. getToken must know which to look for.
  const secureCookie = request.url.startsWith("https://");
  result.secure_cookie = secureCookie;
  result.request_url_prefix = request.url.slice(0, 30);

  // Step 1: Test getToken() with correct secureCookie — reads JWT from request
  try {
    const { getToken } = await import("next-auth/jwt");
    const secret =
      process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
    const token = await getToken({ req: request, secret, secureCookie });
    result.get_token = token ? "ok" : "null (no session cookie)";
    result.token_userId = token?.userId ?? null;
    result.token_role = token?.role ?? null;
    result.token_email = token?.email ?? null;
    result.token_sub = token?.sub ?? null;
    result.token_keys = token ? Object.keys(token) : null;
  } catch (tokenErr) {
    result.get_token_error =
      tokenErr instanceof Error ? tokenErr.message : String(tokenErr);
    result.get_token_stack =
      tokenErr instanceof Error
        ? tokenErr.stack?.split("\n").slice(0, 5)
        : undefined;
  }

  // Step 2: Test requireAuth(request) — the getToken-based approach
  try {
    const { requireAuth } = await import("@/lib/api-handler");
    const { userId } = await requireAuth(request);
    result.require_auth = "ok";
    result.require_auth_user_id = userId;
  } catch (reqErr) {
    result.require_auth_error =
      reqErr instanceof Error ? reqErr.message : String(reqErr);
  }

  // Step 3: Test auth() — the old approach (for comparison)
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    result.auth_session = session;
  } catch (authErr) {
    result.auth_error =
      authErr instanceof Error ? authErr.message : String(authErr);
    result.auth_stack =
      authErr instanceof Error
        ? authErr.stack?.split("\n").slice(0, 5)
        : undefined;
  }

  // Step 4: Show request cookies (names only, not values)
  const cookieHeader = request.headers.get("cookie") ?? "";
  result.cookie_names = cookieHeader
    ? cookieHeader.split(";").map((c) => c.trim().split("=")[0])
    : [];

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/debug/balance-test — Step-by-step balance test.
 * Each step is wrapped in its own try/catch to identify exactly where the crash occurs.
 * TODO: Remove before production launch.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const result: Record<string, unknown> = {};
  const start = Date.now();

  // Step 1: Import and test rate limit (no auth needed)
  try {
    const { enforceRateLimit } = await import("@/lib/enforce-rate-limit");
    await enforceRateLimit(request, "balance_check");
    result.step1_rate_limit = "ok";
  } catch (e) {
    result.step1_rate_limit_error = e instanceof Error ? e.message : String(e);
  }

  // Step 2: Import and test getToken
  let userId: string | null = null;
  try {
    const { getToken } = await import("next-auth/jwt");
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "";
    const secureCookie = request.url.startsWith("https://");
    const token = await getToken({ req: request, secret, secureCookie });
    userId = (token?.userId as string) ?? null;
    result.step2_get_token = token ? "ok" : "null";
    result.step2_user_id = userId;
  } catch (e) {
    result.step2_get_token_error = e instanceof Error ? e.message : String(e);
    result.step2_get_token_stack = e instanceof Error ? e.stack?.split("\n").slice(0, 3) : undefined;
  }

  // Step 3: Import and test getBalance
  if (userId) {
    try {
      const { getBalance } = await import("@/lib/services/balance-service");
      const balance = await getBalance(userId);
      result.step3_balance = {
        amount_cents: balance.amount_cents,
        frozen_cents: balance.frozen_cents,
      };
    } catch (e) {
      result.step3_balance_error = e instanceof Error ? e.message : String(e);
    }
  } else {
    result.step3_skipped = "no userId";
  }

  result.duration_ms = Date.now() - start;
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}

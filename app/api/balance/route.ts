/**
 * GET /api/balance — Check current user balance.
 */
import { NextResponse } from "next/server";
import { getBalance } from "@/lib/services/balance-service";
import { successResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "balance_check");
    const { userId } = await requireAuth();
    const balance = await getBalance(userId);

    return NextResponse.json(
      successResponse(
        {
          amount_cents: balance.amount_cents,
          frozen_cents: balance.frozen_cents,
          total_deposited: balance.total_deposited,
          total_earned: balance.total_earned,
          total_withdrawn: balance.total_withdrawn,
        },
        requestId,
      ),
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

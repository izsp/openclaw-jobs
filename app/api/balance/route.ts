/**
 * GET /api/balance — Check current user balance.
 */
import { getBalance } from "@/lib/services/balance-service";
import { successResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId, jsonResponse } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "balance_check");
    const { userId } = await requireAuth(request);
    const balance = await getBalance(userId);

    return jsonResponse(
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

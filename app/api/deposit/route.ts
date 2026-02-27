/**
 * POST /api/deposit — Create a Stripe Checkout session for depositing funds.
 */
import { NextResponse } from "next/server";
import { createDepositSchema } from "@/lib/validators/deposit.validator";
import { createCheckoutSession } from "@/lib/services/deposit-service";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";
import { HTTP_STATUS, PAYLOAD_LIMITS } from "@/lib/constants";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";
import { readJsonBody } from "@/lib/validate-payload";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "deposit");
    const { userId } = await requireAuth();

    const body: unknown = await readJsonBody(request, PAYLOAD_LIMITS.SMALL_BODY);
    const parsed = createDepositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const result = await createCheckoutSession({
      userId,
      amountCents: parsed.data.amount_cents,
    });

    return NextResponse.json(
      successResponse(
        { session_id: result.sessionId, url: result.url },
        requestId,
      ),
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

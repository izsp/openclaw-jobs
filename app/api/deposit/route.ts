/**
 * POST /api/deposit — Create a Stripe Checkout session for depositing funds.
 */
import { NextResponse } from "next/server";
import { createDepositSchema } from "@/lib/validators/deposit.validator";
import { createCheckoutSession } from "@/lib/services/deposit-service";
import { successResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const { userId } = await requireAuth();

    const body: unknown = await request.json();
    const parsed = createDepositSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message, code: "VALIDATION_ERROR", request_id: requestId },
        { status: 400 },
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

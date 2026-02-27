/**
 * POST /api/worker/withdraw — Request a withdrawal of available balance.
 * Worker must have a bound payout method. Actual payout is a placeholder.
 */
import { NextResponse } from "next/server";
import { requestWithdrawalSchema } from "@/lib/validators/withdrawal.validator";
import { requestWithdrawal } from "@/lib/services/withdrawal-service";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { HTTP_STATUS, PAYLOAD_LIMITS } from "@/lib/constants";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";
import { readJsonBody } from "@/lib/validate-payload";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "withdrawal");
    const worker = await requireWorkerAuth(request);

    if (!worker.payout) {
      return NextResponse.json(
        errorResponse("Bind a payout method first", "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const body: unknown = await readJsonBody(request, PAYLOAD_LIMITS.SMALL_BODY);
    const parsed = requestWithdrawalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const result = await requestWithdrawal(worker._id, parsed.data.amount_cents);

    return NextResponse.json(
      successResponse(result, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

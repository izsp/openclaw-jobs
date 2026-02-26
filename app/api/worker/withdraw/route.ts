/**
 * POST /api/worker/withdraw — Request a withdrawal of available balance.
 * Worker must have a bound payout method. Actual payout is a placeholder.
 */
import { NextResponse } from "next/server";
import { requestWithdrawalSchema } from "@/lib/validators/withdrawal.validator";
import { requestWithdrawal } from "@/lib/services/withdrawal-service";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { generateRequestId } from "@/lib/api-handler";
import { HTTP_STATUS } from "@/lib/constants";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const worker = await requireWorkerAuth(request);

    if (!worker.payout) {
      return NextResponse.json(
        errorResponse("Bind a payout method first", "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const body: unknown = await request.json();
    const parsed = requestWithdrawalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.message, "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const result = await requestWithdrawal(worker._id, parsed.data.amount_cents);

    return NextResponse.json(
      successResponse(result, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        errorResponse(error.message, error.code, requestId),
        { status: error.statusCode },
      );
    }
    console.error(`[${requestId}] Withdrawal error:`, error);
    return NextResponse.json(
      errorResponse("Withdrawal failed", "INTERNAL_ERROR", requestId),
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}

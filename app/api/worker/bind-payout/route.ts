/**
 * POST /api/worker/bind-payout — Bind payout method (PayPal or Solana).
 * Auth: Bearer worker token required.
 */
import { NextResponse } from "next/server";
import { bindPayoutSchema } from "@/lib/validators/worker.validator";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { bindWorkerPayout } from "@/lib/services/worker-bind-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { HTTP_STATUS, PAYLOAD_LIMITS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { readJsonBody } from "@/lib/validate-payload";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const worker = await requireWorkerAuth(request);

    const body = await readJsonBody(request, PAYLOAD_LIMITS.SMALL_BODY);
    const parsed = bindPayoutSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { method, address } = parsed.data;
    await bindWorkerPayout(worker._id, { method, address });

    return NextResponse.json(
      successResponse({ payout: { method, address } }, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

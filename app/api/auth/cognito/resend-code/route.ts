/**
 * POST /api/auth/cognito/resend-code — Resend email verification code.
 */
import { NextResponse } from "next/server";
import { resendCodeSchema } from "@/lib/validators/auth.validator";
import { resendConfirmationCode } from "@/lib/services/cognito-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { PAYLOAD_LIMITS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { readJsonBody } from "@/lib/validate-payload";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const body = await readJsonBody(request, PAYLOAD_LIMITS.SMALL_BODY);
    const parsed = resendCodeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    await resendConfirmationCode(parsed.data.email);

    return NextResponse.json(successResponse({ sent: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

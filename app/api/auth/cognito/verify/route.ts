/**
 * POST /api/auth/cognito/verify — Confirm email with verification code.
 * Calls Cognito ConfirmSignUp.
 */
import { NextResponse } from "next/server";
import { verifySchema } from "@/lib/validators/auth.validator";
import { confirmSignUp } from "@/lib/services/cognito-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { PAYLOAD_LIMITS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { readJsonBody } from "@/lib/validate-payload";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "auth_verify");
    const body = await readJsonBody(request, PAYLOAD_LIMITS.SMALL_BODY);
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { email, code } = parsed.data;
    await confirmSignUp(email, code);

    return NextResponse.json(successResponse({ verified: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

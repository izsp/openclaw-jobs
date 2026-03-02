/**
 * POST /api/auth/cognito/forgot-password — Initiate password reset.
 * Sends a verification code to the user's email via Cognito.
 */
import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators/auth.validator";
import { forgotPassword } from "@/lib/services/cognito-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { PAYLOAD_LIMITS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { readJsonBody } from "@/lib/validate-payload";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "auth_forgot_password");
    const body = await readJsonBody(request, PAYLOAD_LIMITS.SMALL_BODY);
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    await forgotPassword(parsed.data.email);

    return NextResponse.json(successResponse({ sent: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

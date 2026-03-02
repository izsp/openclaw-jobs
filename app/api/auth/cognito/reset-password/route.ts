/**
 * POST /api/auth/cognito/reset-password — Complete password reset.
 * Confirms the forgot-password flow with code + new password.
 */
import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validators/auth.validator";
import { confirmForgotPassword } from "@/lib/services/cognito-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { PAYLOAD_LIMITS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { readJsonBody } from "@/lib/validate-payload";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const body = await readJsonBody(request, PAYLOAD_LIMITS.SMALL_BODY);
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { email, code, newPassword } = parsed.data;
    await confirmForgotPassword(email, code, newPassword);

    return NextResponse.json(successResponse({ reset: true }, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

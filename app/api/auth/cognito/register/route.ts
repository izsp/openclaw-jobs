/**
 * POST /api/auth/cognito/register — Create a new user account.
 * Calls Cognito SignUp; user must verify email before signing in.
 */
import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/validators/auth.validator";
import { signUpUser } from "@/lib/services/cognito-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { HTTP_STATUS, PAYLOAD_LIMITS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { readJsonBody } from "@/lib/validate-payload";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";
import { getConfig } from "@/lib/config";

/** Validates invite code against configured codes. No-op if config has empty array. */
async function validateInviteCode(code: string | undefined): Promise<void> {
  const signupConfig = await getConfig("signup");
  const codes = signupConfig?.invite_codes ?? [];
  if (codes.length === 0) return;
  if (!code || !codes.includes(code)) {
    throw new ValidationError("Invalid invite code");
  }
}

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "auth_register");
    const body = await readJsonBody(request, PAYLOAD_LIMITS.SMALL_BODY);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { email, password, inviteCode } = parsed.data;

    // WHY: Validate invite code BEFORE Cognito signup to avoid orphan accounts.
    await validateInviteCode(inviteCode);

    const { userSub } = await signUpUser(email, password);

    return NextResponse.json(
      successResponse({ userSub }, requestId),
      { status: HTTP_STATUS.CREATED },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

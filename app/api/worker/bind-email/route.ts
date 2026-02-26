/**
 * POST /api/worker/bind-email — Bind email to worker account.
 * Email verification will be implemented in Phase 9.
 * Auth: Bearer worker token required.
 */
import { NextResponse } from "next/server";
import { bindEmailSchema } from "@/lib/validators/worker.validator";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { bindWorkerEmail } from "@/lib/services/worker-bind-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { HTTP_STATUS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const worker = await requireWorkerAuth(request);

    const body = await request.json();
    const parsed = bindEmailSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    await bindWorkerEmail(worker._id, parsed.data.email);

    return NextResponse.json(
      successResponse({ email: parsed.data.email }, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

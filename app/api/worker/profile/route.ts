/**
 * PATCH /api/worker/profile — Update worker preferences, schedule, and limits.
 * Auth: Bearer worker token required.
 */
import { NextResponse } from "next/server";
import { updateProfileSchema } from "@/lib/validators/worker.validator";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { updateWorkerProfile } from "@/lib/services/worker-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { HTTP_STATUS, PAYLOAD_LIMITS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import type { WorkerProfile } from "@/lib/types";
import { readJsonBody } from "@/lib/validate-payload";

export async function PATCH(request: Request) {
  const requestId = generateRequestId();
  try {
    const worker = await requireWorkerAuth(request);

    const body = await readJsonBody(request, PAYLOAD_LIMITS.WORKER_PROFILE);
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const updated = await updateWorkerProfile(
      worker._id,
      parsed.data as Partial<WorkerProfile>,
    );

    return NextResponse.json(
      successResponse({ profile: updated.profile }, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

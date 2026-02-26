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
import { HTTP_STATUS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";

export async function PATCH(request: Request) {
  const requestId = generateRequestId();
  try {
    const worker = await requireWorkerAuth(request);

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    // WHY: Zod schema has all nested fields as optional, but the service
    // accepts Partial<WorkerProfile>. We pass the raw Zod output and the
    // service handles partial merging via dot-notation $set.
    const updated = await updateWorkerProfile(
      worker._id,
      parsed.data as Partial<import("@/lib/types").WorkerProfile>,
    );

    return NextResponse.json(
      successResponse({ profile: updated.profile }, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

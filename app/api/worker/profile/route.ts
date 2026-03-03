/**
 * PATCH /api/worker/profile — Update worker preferences, schedule, limits,
 * and public profile (display_name, bio, slug, offerings).
 * Auth: Bearer worker token required.
 */
import { NextResponse } from "next/server";
import { updateProfileSchema } from "@/lib/validators/worker.validator";
import { updatePublicProfileSchema } from "@/lib/validators/worker-profile.validator";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { updateWorkerProfile } from "@/lib/services/worker-service";
import { updatePublicProfile } from "@/lib/services/worker-profile-service";
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

    // Try public profile fields first
    const publicParsed = updatePublicProfileSchema.safeParse(body);
    const hasPublicFields = publicParsed.success && Object.keys(publicParsed.data).length > 0;

    // Try internal profile fields (preferences, schedule, limits)
    const profileParsed = updateProfileSchema.safeParse(body);
    const hasProfileFields = profileParsed.success && Object.keys(profileParsed.data).length > 0;

    if (!hasPublicFields && !hasProfileFields) {
      throw new ValidationError("No valid profile fields provided");
    }

    let result: Record<string, unknown> = {};

    if (hasPublicFields) {
      const updated = await updatePublicProfile(worker._id, publicParsed.data);
      result = {
        ...result,
        display_name: updated.display_name,
        bio: updated.bio,
        slug: updated.slug,
        offerings: updated.offerings,
      };
    }

    if (hasProfileFields) {
      const updated = await updateWorkerProfile(
        worker._id,
        profileParsed.data as Partial<WorkerProfile>,
      );
      result = { ...result, profile: updated.profile };
    }

    return NextResponse.json(
      successResponse(result, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

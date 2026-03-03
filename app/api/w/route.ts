/**
 * GET /api/w — List workers with public profiles.
 * No authentication required. Rate limited by IP.
 */
import { listPublicProfiles } from "@/lib/services/worker-profile-service";
import { successResponse } from "@/lib/types/api.types";
import { handleApiError, generateRequestId, jsonResponse } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "worker_profile");
    const profiles = await listPublicProfiles();
    return jsonResponse(successResponse(profiles, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

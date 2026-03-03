/**
 * GET /api/w/[slug] — Public worker profile endpoint.
 * No authentication required. Rate limited by IP.
 */
import { getPublicProfileBySlug } from "@/lib/services/worker-profile-service";
import { successResponse } from "@/lib/types/api.types";
import { handleApiError, generateRequestId, jsonResponse } from "@/lib/api-handler";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";
import { slugSchema } from "@/lib/validators/worker-profile.validator";
import { ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "worker_profile");
    const { slug } = await params;

    const parsed = slugSchema.safeParse(slug);
    if (!parsed.success) {
      throw new ValidationError("Invalid worker slug");
    }

    const profile = await getPublicProfileBySlug(parsed.data);

    return jsonResponse(successResponse(profile, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

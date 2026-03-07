/**
 * GET /api/admin/workers — List workers with search and filters.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { workerListSchema } from "@/lib/validators/admin.validator";
import { listWorkers } from "@/lib/services/admin-worker-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      tier: searchParams.get("tier") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    };

    const parsed = workerListSchema.safeParse(params);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const result = await listWorkers(parsed.data);
    return jsonResponse(successResponse(result, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

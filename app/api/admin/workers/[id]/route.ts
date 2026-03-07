/**
 * GET  /api/admin/workers/[id] — Get full worker details.
 * PATCH /api/admin/workers/[id] — Update worker tier or status.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { workerUpdateSchema } from "@/lib/validators/admin.validator";
import { readJsonBody } from "@/lib/validate-payload";
import { PAYLOAD_LIMITS } from "@/lib/constants";
import { getWorkerFull, updateWorkerAdmin } from "@/lib/services/admin-worker-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);
    const { id } = await context.params;
    const worker = await getWorkerFull(id);
    return jsonResponse(successResponse(worker, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);
    const { id } = await context.params;

    const body = await readJsonBody(request, PAYLOAD_LIMITS.ADMIN_BODY);
    const parsed = workerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const worker = await updateWorkerAdmin(id, parsed.data, "admin");
    return jsonResponse(successResponse(worker, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

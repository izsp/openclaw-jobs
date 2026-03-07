/**
 * GET /api/admin/tasks/[id] — Get full task details including _internal.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { getTaskFull } from "@/lib/services/admin-task-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);
    const { id } = await context.params;
    const task = await getTaskFull(id);
    return jsonResponse(successResponse(task, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

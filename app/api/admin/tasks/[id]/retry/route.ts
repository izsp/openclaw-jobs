/**
 * POST /api/admin/tasks/[id]/retry — Retry a failed/completed task.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { retryTask } from "@/lib/services/admin-task-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);
    const { id } = await context.params;
    const task = await retryTask(id, "admin");
    return jsonResponse(successResponse(task, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

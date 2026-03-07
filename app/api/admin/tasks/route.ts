/**
 * GET /api/admin/tasks — List tasks with filters.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { taskListSchema } from "@/lib/validators/admin.validator";
import { listTasks } from "@/lib/services/admin-task-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      is_qa: searchParams.get("is_qa") ?? undefined,
      worker_id: searchParams.get("worker_id") ?? undefined,
      buyer_id: searchParams.get("buyer_id") ?? undefined,
    };

    const parsed = taskListSchema.safeParse(params);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const result = await listTasks(parsed.data);
    return jsonResponse(successResponse(result, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

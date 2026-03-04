/**
 * GET /api/task/[id] — Check task status and result.
 */
import { taskIdParamSchema } from "@/lib/validators/task.validator";
import { getTaskForBuyer } from "@/lib/services/task-service";
import { lookupWorkerDisplay } from "@/lib/services/worker-display-service";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId, jsonResponse } from "@/lib/api-handler";
import { HTTP_STATUS } from "@/lib/constants";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "task_check");
    const { userId } = await requireAuth(request);

    const { id } = await context.params;
    const parsed = taskIdParamSchema.safeParse(id);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse("Invalid task ID", "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const task = await getTaskForBuyer(parsed.data, userId);

    // Look up worker display info for completed tasks
    const workerInfo = task.status === "completed" && task.worker_id
      ? await lookupWorkerDisplay(task.worker_id)
      : null;

    return jsonResponse(
      successResponse(
        {
          task_id: task._id,
          status: task.status,
          type: task.type,
          price_cents: task.price_cents,
          output: task.output,
          completed_at: task.completed_at?.toISOString() ?? null,
          created_at: task.created_at.toISOString(),
          worker_display_name: workerInfo?.display_name ?? null,
          worker_avatar_url: workerInfo?.avatar_url ?? null,
        },
        requestId,
      ),
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

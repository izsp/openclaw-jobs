/**
 * GET /api/task/[id] — Check task status and result.
 */
import { NextResponse } from "next/server";
import { taskIdParamSchema } from "@/lib/validators/task.validator";
import { getTaskForBuyer } from "@/lib/services/task-service";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";
import { HTTP_STATUS } from "@/lib/constants";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "task_check");
    const { userId } = await requireAuth();

    const { id } = await context.params;
    const parsed = taskIdParamSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Invalid task ID", "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const task = await getTaskForBuyer(parsed.data, userId);

    return NextResponse.json(
      successResponse(
        {
          task_id: task._id,
          status: task.status,
          type: task.type,
          price_cents: task.price_cents,
          output: task.output,
          completed_at: task.completed_at?.toISOString() ?? null,
          created_at: task.created_at.toISOString(),
        },
        requestId,
      ),
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

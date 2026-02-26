/**
 * GET /api/task/[id] — Check task status and result.
 */
import { NextResponse } from "next/server";
import { taskIdParamSchema } from "@/lib/validators/task.validator";
import { getTaskForBuyer } from "@/lib/services/task-service";
import { successResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    const { userId } = await requireAuth();

    const { id } = await context.params;
    const parsed = taskIdParamSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid task ID", code: "VALIDATION_ERROR", request_id: requestId },
        { status: 400 },
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

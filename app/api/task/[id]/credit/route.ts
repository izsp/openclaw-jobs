/**
 * POST /api/task/[id]/credit — Request auto-credit for a completed task.
 */
import { NextResponse } from "next/server";
import { taskIdParamSchema } from "@/lib/validators/task.validator";
import { creditTask } from "@/lib/services/task-service";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";
import { HTTP_STATUS } from "@/lib/constants";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    const { userId } = await requireAuth();

    const { id } = await context.params;
    const parsed = taskIdParamSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Invalid task ID", "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const balanceAfter = await creditTask(parsed.data, userId);

    return NextResponse.json(
      successResponse(
        { balance_after_cents: balanceAfter },
        requestId,
      ),
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

/**
 * POST /api/task/[id]/credit — Request auto-credit for a completed task.
 */
import { taskIdParamSchema } from "@/lib/validators/task.validator";
import { creditTask } from "@/lib/services/task-service";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId, jsonResponse } from "@/lib/api-handler";
import { HTTP_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    const { userId } = await requireAuth(request);

    const { id } = await context.params;
    const parsed = taskIdParamSchema.safeParse(id);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse("Invalid task ID", "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const balanceAfter = await creditTask(parsed.data, userId);

    return jsonResponse(
      successResponse(
        { balance_after_cents: balanceAfter },
        requestId,
      ),
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

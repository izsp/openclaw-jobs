/**
 * POST /api/task — Submit a new task for the worker network.
 * Validates input, estimates price, deducts balance, creates task.
 */
import { NextResponse } from "next/server";
import { createTaskSchema } from "@/lib/validators/task.validator";
import { createTask } from "@/lib/services/task-service";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";
import { HTTP_STATUS, PAYLOAD_LIMITS } from "@/lib/constants";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";
import { readJsonBody } from "@/lib/validate-payload";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "task_submit");
    const { userId } = await requireAuth();

    const body: unknown = await readJsonBody(request, PAYLOAD_LIMITS.TASK_INPUT);
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const result = await createTask({
      buyerId: userId,
      type: parsed.data.type,
      input: parsed.data.input,
      sensitive: parsed.data.sensitive,
      constraints: parsed.data.constraints,
      inputPreview: parsed.data.input_preview,
    });

    return NextResponse.json(
      successResponse(
        {
          task_id: result.taskId,
          price_cents: result.priceCents,
          balance_after_cents: result.balanceAfter,
          deadline: result.deadline.toISOString(),
        },
        requestId,
      ),
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

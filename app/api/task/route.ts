/**
 * POST /api/task — Submit a new task for the worker network.
 * Validates input, estimates price, deducts balance, creates task.
 */
import { NextResponse } from "next/server";
import { createTaskSchema } from "@/lib/validators/task.validator";
import { createTask } from "@/lib/services/task-service";
import { successResponse } from "@/lib/types/api.types";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const { userId } = await requireAuth();

    const body: unknown = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message, code: "VALIDATION_ERROR", request_id: requestId },
        { status: 400 },
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

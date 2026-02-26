/**
 * POST /api/work/submit — Submit task result.
 * Idempotent: rejects if task already completed.
 * Triggers settlement (commission + worker credit) and QA injection.
 * Auth: Bearer worker token required.
 */
import { NextResponse } from "next/server";
import { submitTaskSchema } from "@/lib/validators/worker.validator";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { submitTaskResult } from "@/lib/services/dispatch-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { HTTP_STATUS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const worker = await requireWorkerAuth(request);

    const body = await request.json();
    const parsed = submitTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { task_id, output } = parsed.data;
    const result = await submitTaskResult(worker, task_id, output);

    return NextResponse.json(
      successResponse(
        {
          task_id: result.taskId,
          earned_cents: result.earnedCents,
          stats: result.stats,
        },
        requestId,
      ),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

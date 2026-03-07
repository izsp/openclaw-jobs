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
import { HTTP_STATUS, PAYLOAD_LIMITS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";
import { readJsonBody } from "@/lib/validate-payload";
import { verifyAttachmentsExist } from "@/lib/services/attachment-verify";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "work_submit");
    const worker = await requireWorkerAuth(request);

    const body = await readJsonBody(request, PAYLOAD_LIMITS.WORK_SUBMIT);
    const parsed = submitTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { task_id, output } = parsed.data;

    // Verify all declared attachments actually exist in S3
    if (output.attachments && output.attachments.length > 0) {
      await verifyAttachmentsExist(output.attachments);
    }

    const result = await submitTaskResult(worker, task_id, output);

    const data: Record<string, unknown> = {
      task_id: result.taskId,
      earned_cents: result.earnedCents,
      stats: result.stats,
    };
    if (result.exam) {
      data.exam = result.exam;
    }

    return NextResponse.json(
      successResponse(data, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

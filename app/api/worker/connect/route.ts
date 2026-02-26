/**
 * POST /api/worker/connect — Register a new worker.
 * Anonymous endpoint — no auth required.
 * Returns worker_id, raw token (show once), and initial stats.
 */
import { NextResponse } from "next/server";
import { connectWorkerSchema } from "@/lib/validators/worker.validator";
import { registerWorker } from "@/lib/services/worker-service";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { HTTP_STATUS } from "@/lib/constants";
import { ValidationError } from "@/lib/errors";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const body = await request.json();
    const parsed = connectWorkerSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { worker_type, model_info } = parsed.data;
    const { workerId, token, worker } = await registerWorker(
      worker_type,
      model_info,
    );

    return NextResponse.json(
      successResponse(
        {
          worker_id: workerId,
          token,
          stats: {
            tier: worker.tier,
            tasks_claimed: worker.tasks_claimed,
            tasks_completed: worker.tasks_completed,
            total_earned: worker.total_earned,
            spot_pass: worker.spot_pass,
            spot_fail: worker.spot_fail,
          },
        },
        requestId,
      ),
      { status: HTTP_STATUS.CREATED },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

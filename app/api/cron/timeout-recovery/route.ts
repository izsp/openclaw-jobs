/**
 * GET /api/cron/timeout-recovery — Cloudflare Cron Trigger handler.
 * Resets expired assigned tasks back to pending.
 * Protected by CRON_SECRET header to prevent external calls.
 */
import { NextResponse, type NextRequest } from "next/server";
import { recoverExpiredTasks } from "@/lib/services/timeout-recovery";
import { generateRequestId } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { HTTP_STATUS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      errorResponse("Unauthorized", "AUTH_ERROR", requestId),
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  try {
    const result = await recoverExpiredTasks();

    return NextResponse.json(
      successResponse(
        {
          recovered: result.recovered,
          workers_penalized: result.workersPenalized,
        },
        requestId,
      ),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    console.error(`[${requestId}] Timeout recovery error:`, error);
    return NextResponse.json(
      errorResponse("Recovery failed", "INTERNAL_ERROR", requestId),
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}

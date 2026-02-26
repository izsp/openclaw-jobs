/**
 * GET /api/work/next — Claim the next available task.
 * Supports long-polling via ?wait=N (seconds, max 30).
 * Auth: Bearer worker token required.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { claimNextTask } from "@/lib/services/dispatch-service";
import { buildWorkerStats } from "@/lib/services/worker-stats";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { HTTP_STATUS } from "@/lib/constants";

/** Maximum long-poll wait time in seconds. */
const MAX_WAIT_SECONDS = 30;

/** Polling interval for long-poll retry in milliseconds. */
const POLL_INTERVAL_MS = 2000;

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();
  try {
    const worker = await requireWorkerAuth(request);

    const waitParam = request.nextUrl.searchParams.get("wait");
    const waitSeconds = Math.min(
      Math.max(parseInt(waitParam ?? "15", 10) || 15, 1),
      MAX_WAIT_SECONDS,
    );
    const deadline = Date.now() + waitSeconds * 1000;

    // Long-poll: try claiming, retry until deadline
    let result = await claimNextTask(worker);
    while (!result && Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      result = await claimNextTask(worker);
    }

    if (!result) {
      const stats = await buildWorkerStats(worker, false);
      return NextResponse.json(
        successResponse({ task: null, stats }, requestId),
        { status: HTTP_STATUS.NO_CONTENT },
      );
    }

    return NextResponse.json(
      successResponse(
        { task: result.task, stats: result.stats },
        requestId,
      ),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

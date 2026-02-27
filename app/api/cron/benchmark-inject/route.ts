/**
 * GET /api/cron/benchmark-inject — Cloudflare Cron Trigger handler.
 * Injects a benchmark task with a known-good answer for QA calibration.
 * Protected by CRON_SECRET header.
 */
import { NextResponse, type NextRequest } from "next/server";
import { injectBenchmarkTask } from "@/lib/services/benchmark-inject";
import { generateRequestId } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { HTTP_STATUS } from "@/lib/constants";
import { logError } from "@/lib/logger";
import { safeEqual } from "@/lib/timing-safe-equal";

export async function GET(request: NextRequest) {
  const requestId = generateRequestId();

  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || !authHeader || !safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json(
      errorResponse("Unauthorized", "AUTH_ERROR", requestId),
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }

  try {
    const taskId = await injectBenchmarkTask();

    return NextResponse.json(
      successResponse({ injected: !!taskId, task_id: taskId }, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    logError(`Benchmark inject failed: ${error instanceof Error ? error.message : "Unknown"}`, { request_id: requestId });
    return NextResponse.json(
      errorResponse("Injection failed", "INTERNAL_ERROR", requestId),
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}

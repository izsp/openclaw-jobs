/**
 * GET /api/cron/unfreeze-earnings — Cloudflare Cron Trigger handler.
 * Moves matured frozen earnings to available balance (runs hourly).
 * Protected by CRON_SECRET header.
 */
import { NextResponse, type NextRequest } from "next/server";
import { unfreezeMaturedEarnings } from "@/lib/services/unfreeze-service";
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
    const result = await unfreezeMaturedEarnings();

    return NextResponse.json(
      successResponse(result, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    logError(`Unfreeze earnings failed: ${error instanceof Error ? error.message : "Unknown"}`, { request_id: requestId });
    return NextResponse.json(
      errorResponse("Unfreeze failed", "INTERNAL_ERROR", requestId),
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}

/**
 * GET /api/cron/task-purge — EventBridge scheduled rule handler.
 * Deletes expired tasks and cleans up their S3 attachments.
 * Protected by CRON_SECRET header to prevent external calls.
 */
import { NextResponse, type NextRequest } from "next/server";
import { purgeExpiredTasks } from "@/lib/services/task-purge-service";
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
    const result = await purgeExpiredTasks();

    return NextResponse.json(
      successResponse(
        {
          purged: result.purgedCount,
          attachments_deleted: result.attachmentsDeleted,
        },
        requestId,
      ),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    logError(`Task purge failed: ${error instanceof Error ? error.message : "Unknown"}`, { request_id: requestId });
    return NextResponse.json(
      errorResponse("Purge failed", "INTERNAL_ERROR", requestId),
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}

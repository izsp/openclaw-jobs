/**
 * GET /api/task/[id]/attachment/[key] — Buyer downloads a task attachment.
 * Auth: signed-in buyer who owns the task.
 * Returns 302 redirect to a presigned S3 GET URL.
 */
import { NextResponse } from "next/server";
import { requireAuth, handleApiError, generateRequestId } from "@/lib/api-handler";
import { COLLECTIONS } from "@/lib/constants";
import { NotFoundError } from "@/lib/errors";
import { generateDownloadUrl } from "@/lib/services/s3-attachment-service";
import { getDb } from "@/lib/db";
import type { TaskDocument } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string; key: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    const { userId } = await requireAuth(request);
    const { id: taskId, key } = await context.params;

    const db = await getDb();
    const task = await db
      .collection<TaskDocument>(COLLECTIONS.TASK)
      .findOne({ _id: taskId, buyer_id: userId });

    if (!task) {
      throw new NotFoundError("Task");
    }

    const attachments = task.output?.attachments;
    if (!attachments || attachments.length === 0) {
      throw new NotFoundError("No attachments on this task");
    }

    // Match by s3_key — the [key] param is URL-encoded
    const decodedKey = decodeURIComponent(key);
    const attachment = attachments.find((a) => a.s3_key === decodedKey);
    if (!attachment) {
      throw new NotFoundError("Attachment not found");
    }

    const downloadUrl = await generateDownloadUrl(
      attachment.s3_key,
      attachment.filename,
    );

    return NextResponse.redirect(downloadUrl, 302);
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

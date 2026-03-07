/**
 * POST /api/work/upload-url — Worker requests a presigned S3 upload URL.
 * Auth: Bearer worker token required.
 * Validates that the task exists and is assigned to this worker.
 */
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { uploadUrlSchema } from "@/lib/validators/attachment.validator";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { handleApiError, generateRequestId } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { HTTP_STATUS, COLLECTIONS, ATTACHMENT_LIMITS } from "@/lib/constants";
import { ValidationError, NotFoundError, AuthError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/enforce-rate-limit";
import { readJsonBody } from "@/lib/validate-payload";
import { generateUploadUrl } from "@/lib/services/s3-attachment-service";
import { getDb } from "@/lib/db";
import type { TaskDocument } from "@/lib/types";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    await enforceRateLimit(request, "work_submit");
    const worker = await requireWorkerAuth(request);

    const body = await readJsonBody(request, PAYLOAD_LIMITS_UPLOAD);
    const parsed = uploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0].message);
    }

    const { task_id, filename, content_type, size_bytes } = parsed.data;

    // Verify task is assigned to this worker
    const db = await getDb();
    const task = await db
      .collection<TaskDocument>(COLLECTIONS.TASK)
      .findOne({ _id: task_id, worker_id: worker._id, status: "assigned" });

    if (!task) {
      throw new NotFoundError("Task not found or not assigned to you");
    }

    const fileId = nanoid();
    const { s3Key, uploadUrl } = await generateUploadUrl(
      task_id,
      fileId,
      filename,
      content_type,
      size_bytes,
    );

    return NextResponse.json(
      successResponse({ s3_key: s3Key, upload_url: uploadUrl }, requestId),
      { status: HTTP_STATUS.OK },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

/** Small payload limit for upload URL requests. */
const PAYLOAD_LIMITS_UPLOAD = 4 * 1024;

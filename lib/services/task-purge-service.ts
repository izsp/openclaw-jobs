/**
 * Purges expired tasks and their S3 attachments.
 * Tasks with purge_at in the past are permanently deleted.
 */
import { COLLECTIONS } from "@/lib/constants";
import type { TaskDocument } from "@/lib/types";
import { getDb } from "@/lib/db";
import { deleteAttachments } from "./s3-attachment-service";

/** Result of a purge operation. */
export interface PurgeResult {
  purgedCount: number;
  attachmentsDeleted: number;
}

/**
 * Deletes tasks whose purge_at has passed and cleans up S3 attachments.
 * Called by the cron job.
 */
export async function purgeExpiredTasks(): Promise<PurgeResult> {
  const db = await getDb();
  const now = new Date();

  // Find tasks ready for purge
  const expiredTasks = await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .find({ purge_at: { $lte: now } })
    .project({ _id: 1, "output.attachments": 1 })
    .limit(500)
    .toArray();

  if (expiredTasks.length === 0) {
    return { purgedCount: 0, attachmentsDeleted: 0 };
  }

  // Collect all S3 keys from attachments
  const s3Keys: string[] = [];
  for (const task of expiredTasks) {
    const attachments = (task as unknown as TaskDocument).output?.attachments;
    if (attachments) {
      for (const att of attachments) {
        s3Keys.push(att.s3_key);
      }
    }
  }

  // Delete S3 objects (if any)
  if (s3Keys.length > 0) {
    await deleteAttachments(s3Keys);
  }

  // Delete the task documents
  const taskIds = expiredTasks.map((t) => t._id);
  await db
    .collection<TaskDocument>(COLLECTIONS.TASK)
    .deleteMany({ _id: { $in: taskIds } });

  return { purgedCount: taskIds.length, attachmentsDeleted: s3Keys.length };
}

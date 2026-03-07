/**
 * Verifies that declared attachments exist in S3 before accepting a submission.
 */
import { headAttachment } from "./s3-attachment-service";
import { ValidationError } from "@/lib/errors";
import type { TaskAttachment } from "@/lib/types";

/**
 * Checks that every attachment in the list exists in S3.
 * @throws ValidationError if any attachment is missing or inaccessible.
 */
export async function verifyAttachmentsExist(
  attachments: TaskAttachment[],
): Promise<void> {
  const results = await Promise.allSettled(
    attachments.map((a) => headAttachment(a.s3_key)),
  );

  const missing: string[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "rejected") {
      missing.push(attachments[i].filename);
    }
  }

  if (missing.length > 0) {
    throw new ValidationError(
      `Attachments not found in S3: ${missing.join(", ")}. Upload files before submitting.`,
    );
  }
}

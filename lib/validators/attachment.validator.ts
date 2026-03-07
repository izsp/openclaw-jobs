/**
 * Zod schemas for attachment-related API input validation.
 */
import { z } from "zod";
import { ATTACHMENT_LIMITS } from "@/lib/constants";

/** Allowed MIME type prefixes for uploads. */
const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/gzip",
  "application/json",
  "text/",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
] as const;

/** Validates that a MIME type is in the allowlist. */
function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

/** Sanitizes a filename: strips path traversal, control chars, limits length. */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim()
    .slice(0, 255);
}

/** POST /api/work/upload-url — request a presigned upload URL. */
export const uploadUrlSchema = z.object({
  task_id: z.string().startsWith("task_"),
  filename: z
    .string()
    .min(1)
    .max(255)
    .transform(sanitizeFilename)
    .refine((f) => f.length > 0, "Filename cannot be empty after sanitization"),
  content_type: z
    .string()
    .min(1)
    .max(255)
    .refine(isAllowedMime, "File type not allowed"),
  size_bytes: z
    .number()
    .int()
    .positive()
    .max(ATTACHMENT_LIMITS.MAX_FILE_BYTES, "File exceeds 100 MB limit"),
});

/** Shape of a single attachment in submit output. */
export const attachmentSchema = z.object({
  s3_key: z
    .string()
    .regex(/^tasks\/task_[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.\w+$/, "Invalid S3 key format"),
  filename: z.string().min(1).max(255),
  content_type: z.string().min(1).max(255),
  size_bytes: z.number().int().positive(),
});

/** Optional attachments array for task submission. */
export const attachmentsArraySchema = z
  .array(attachmentSchema)
  .max(ATTACHMENT_LIMITS.MAX_PER_TASK, `Maximum ${ATTACHMENT_LIMITS.MAX_PER_TASK} attachments per task`);

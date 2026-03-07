/**
 * S3 attachment service — generates presigned URLs for worker uploads
 * and buyer downloads. Uses lazy-initialized singleton S3 client.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ATTACHMENT_LIMITS } from "@/lib/constants";

/** Lazy-initialized S3 client singleton. */
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: process.env.AWS_REGION ?? "ap-southeast-1" });
  }
  return s3Client;
}

function getBucket(): string {
  const bucket = process.env.S3_ATTACHMENTS_BUCKET;
  if (!bucket) throw new Error("S3_ATTACHMENTS_BUCKET not configured");
  return bucket;
}

/**
 * Generates a presigned PUT URL for a worker to upload a file directly to S3.
 * @returns The S3 key and presigned upload URL.
 */
export async function generateUploadUrl(
  taskId: string,
  fileId: string,
  filename: string,
  contentType: string,
  maxBytes: number,
): Promise<{ s3Key: string; uploadUrl: string }> {
  const ext = filename.includes(".") ? filename.slice(filename.lastIndexOf(".")) : "";
  const s3Key = `tasks/${taskId}/${fileId}${ext}`;

  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: s3Key,
    ContentType: contentType,
    ContentLength: maxBytes,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: ATTACHMENT_LIMITS.UPLOAD_URL_EXPIRES_SECONDS,
  });

  return { s3Key, uploadUrl };
}

/**
 * Generates a presigned GET URL for a buyer to download an attachment.
 * Sets Content-Disposition to trigger browser download with original filename.
 */
export async function generateDownloadUrl(
  s3Key: string,
  filename: string,
): Promise<string> {
  const encodedFilename = encodeURIComponent(filename);

  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${encodedFilename}"`,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: ATTACHMENT_LIMITS.DOWNLOAD_URL_EXPIRES_SECONDS,
  });
}

/**
 * Checks if an S3 object exists and returns its metadata.
 * @throws Error if the object does not exist.
 */
export async function headAttachment(
  s3Key: string,
): Promise<{ contentType: string; size: number }> {
  const command = new HeadObjectCommand({
    Bucket: getBucket(),
    Key: s3Key,
  });

  const response = await getS3Client().send(command);
  return {
    contentType: response.ContentType ?? "application/octet-stream",
    size: response.ContentLength ?? 0,
  };
}

/**
 * Deletes multiple S3 objects. Used during task purge.
 * Silently ignores objects that don't exist.
 */
export async function deleteAttachments(s3Keys: string[]): Promise<void> {
  if (s3Keys.length === 0) return;

  const command = new DeleteObjectsCommand({
    Bucket: getBucket(),
    Delete: {
      Objects: s3Keys.map((Key) => ({ Key })),
      Quiet: true,
    },
  });

  await getS3Client().send(command);
}

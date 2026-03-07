"use client";

import { useState } from "react";

interface Attachment {
  s3_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

interface AttachmentListProps {
  attachments: Attachment[];
  taskId: string;
}

/** Formats bytes into human-readable size. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an icon based on MIME type. */
function mimeIcon(contentType: string): string {
  if (contentType.startsWith("image/")) return "\u{1F5BC}";
  if (contentType === "application/pdf") return "\u{1F4C4}";
  if (contentType.startsWith("video/")) return "\u{1F3AC}";
  if (contentType.startsWith("audio/")) return "\u{1F3B5}";
  if (contentType.includes("zip") || contentType.includes("gzip")) return "\u{1F4E6}";
  if (contentType.startsWith("text/")) return "\u{1F4DD}";
  return "\u{1F4CE}";
}

/** Builds the API download URL for an attachment. */
function downloadUrl(taskId: string, s3Key: string): string {
  return `/api/task/${encodeURIComponent(taskId)}/attachment/${encodeURIComponent(s3Key)}`;
}

/** Renders a list of task attachments with download links and image previews. */
export function AttachmentList({ attachments, taskId }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="border-t border-edge px-4 py-3">
      <p className="mb-2 text-xs font-medium text-content-secondary">
        Attachments ({attachments.length})
      </p>
      <div className="space-y-1.5">
        {attachments.map((att) => (
          <AttachmentItem key={att.s3_key} attachment={att} taskId={taskId} />
        ))}
      </div>
    </div>
  );
}

function AttachmentItem({ attachment, taskId }: { attachment: Attachment; taskId: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const isImage = attachment.content_type.startsWith("image/");
  const url = downloadUrl(taskId, attachment.s3_key);

  return (
    <div>
      <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
        <span className="text-sm">{mimeIcon(attachment.content_type)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-content">
            {attachment.filename}
          </p>
          <p className="text-[10px] text-content-tertiary">{formatSize(attachment.size_bytes)}</p>
        </div>
        <div className="flex items-center gap-1">
          {isImage && (
            <button
              onClick={() => setPreviewUrl(previewUrl ? null : url)}
              className="rounded px-2 py-1 text-[10px] text-content-secondary hover:bg-edge-strong/50 hover:text-content"
            >
              {previewUrl ? "Hide" : "Preview"}
            </button>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded px-2 py-1 text-[10px] text-accent hover:bg-edge-strong/50 hover:text-accent"
          >
            Download
          </a>
        </div>
      </div>
      {previewUrl && (
        <div className="mt-1 overflow-hidden rounded-lg border border-edge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={attachment.filename}
            className="max-h-64 w-full object-contain"
          />
        </div>
      )}
    </div>
  );
}

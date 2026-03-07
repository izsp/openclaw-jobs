/**
 * Browser-agnostic file download trigger utility.
 * Creates a temporary object URL and programmatically clicks a hidden anchor
 * to initiate a file download from in-memory content.
 */

const DEFAULT_MIME_TYPE = "text/plain;charset=utf-8";

/**
 * Triggers a browser file download from a Blob or string content.
 * @param content - The file content as a string or pre-built Blob.
 * @param filename - The suggested filename for the download.
 * @param mimeType - MIME type when content is a string. Defaults to "text/plain;charset=utf-8".
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType?: string,
): void {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType ?? DEFAULT_MIME_TYPE });

  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();

  // Clean up: remove element and revoke object URL
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

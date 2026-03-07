/**
 * Dynamic ZIP file creation and download utility.
 * Lazily imports JSZip to avoid bundling it when not needed.
 */

import { downloadFile } from "./download-file";

const ZIP_MIME_TYPE = "application/zip";

/** A file entry to include in the ZIP archive. */
interface ZipFileEntry {
  filename: string;
  content: string | Blob | ArrayBuffer;
}

/**
 * Creates and downloads a ZIP file containing the given files.
 * JSZip is dynamically imported so it is only loaded when a user
 * actually requests a ZIP download.
 * @param files - Array of file entries with filename and string/blob content.
 * @param zipFilename - The suggested filename for the downloaded ZIP.
 * @throws Error if JSZip fails to load or ZIP generation fails.
 */
export async function downloadZip(
  files: ZipFileEntry[],
  zipFilename: string,
): Promise<void> {
  // WHY: Dynamic import keeps JSZip out of the initial bundle.
  // It is only fetched when the user explicitly requests a ZIP download.
  const jszip = await import("jszip");
  // jszip uses `export =` so the constructor lands on the module itself
  const JSZip = ("default" in jszip ? jszip.default : jszip) as typeof import("jszip");

  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.filename, file.content);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  downloadFile(blob, zipFilename, ZIP_MIME_TYPE);
}

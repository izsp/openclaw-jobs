/**
 * Smart download option generator for task results.
 * Analyzes artifacts and raw markdown to produce context-aware
 * download actions (markdown, code files, CSVs, HTML, ZIPs).
 */

import type {
  Artifact,
  CodeArtifact,
  HtmlArtifact,
  TableArtifact,
} from "./artifact-types";
import { downloadFile } from "./download-file";
import { generateCsv } from "./generate-csv";
import { buildCodeZipEntries, deriveTableName, sanitizeFilename } from "./download-filename";

/** A download option presented to the user. */
export interface DownloadOption {
  /** Human-readable label for the download button. */
  label: string;
  /** Emoji icon for visual identification. */
  icon: string;
  /** Callback that triggers the download. May be async for ZIP creation. */
  action: () => void | Promise<void>;
}

/** Maximum number of tables before they are combined into a single CSV. */
const TABLE_COMBINE_THRESHOLD = 3;

/** MIME types for source file downloads. */
const FORMAT_CONFIG: Record<string, { ext: string; mime: string; label: string }> = {
  html: { ext: ".html", mime: "text/html;charset=utf-8", label: "Download .html" },
  markdown: { ext: ".md", mime: "text/markdown;charset=utf-8", label: "Download .md" },
  text: { ext: ".txt", mime: "text/plain;charset=utf-8", label: "Download .txt" },
};

/** Shape of an attachment from result metadata. */
interface AttachmentMeta {
  s3_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

/**
 * Generates context-aware download options from artifacts and raw content.
 * @param artifacts - Parsed artifacts from the result.
 * @param rawContent - The full raw content string.
 * @param taskId - The task identifier, used for default filenames.
 * @param format - The output format from the worker (e.g. "html", "markdown").
 * @param attachments - Optional S3 attachments from the task output.
 * @returns An array of download options tailored to the content.
 */
export function generateDownloads(
  artifacts: Artifact[],
  rawContent: string,
  taskId: string,
  format?: string,
  attachments?: AttachmentMeta[],
): DownloadOption[] {
  const options: DownloadOption[] = [];

  // Always offer source file download matching the actual format
  const fmtConfig = FORMAT_CONFIG[format ?? ""] ?? FORMAT_CONFIG.markdown;
  options.push({
    label: fmtConfig.label,
    icon: "\u{1F4DD}",
    action: () => downloadFile(rawContent, `${taskId}${fmtConfig.ext}`, fmtConfig.mime),
  });

  const codeArtifacts = artifacts.filter((a): a is CodeArtifact => a.type === "code");
  addCodeOptions(options, codeArtifacts, taskId);

  const tableArtifacts = artifacts.filter((a): a is TableArtifact => a.type === "table");
  addTableOptions(options, tableArtifacts, taskId);

  const htmlArtifacts = artifacts.filter((a): a is HtmlArtifact => a.type === "html");
  if (htmlArtifacts.length > 0) {
    options.push({
      label: "Download .html",
      icon: "\u{1F310}",
      action: () => {
        const html = htmlArtifacts.map((a) => a.html).join("\n\n");
        downloadFile(html, `${taskId}.html`, "text/html;charset=utf-8");
      },
    });
  }

  addAttachmentOptions(options, taskId, attachments);

  return options;
}

/**
 * Adds code download options. Single file for one block, ZIP for multiple.
 */
function addCodeOptions(
  options: DownloadOption[],
  codeArtifacts: CodeArtifact[],
  taskId: string,
): void {
  if (codeArtifacts.length === 0) return;

  if (codeArtifacts.length === 1) {
    const artifact = codeArtifacts[0];
    const filename = artifact.inferredFilename ?? `${taskId}.txt`;
    options.push({
      label: `Download ${filename}`,
      icon: "\u{1F4C4}",
      action: () => downloadFile(artifact.code, filename),
    });
    return;
  }

  options.push({
    label: "Download All Code (.zip)",
    icon: "\u{1F4E6}",
    action: async () => {
      const { downloadZip } = await import("./download-zip");
      const files = buildCodeZipEntries(codeArtifacts);
      await downloadZip(files, `${taskId}-code.zip`);
    },
  });
}

/**
 * Adds table CSV download options.
 * Up to 3 tables: individual CSV per table.
 * More than 3: single combined CSV with section headers.
 */
function addTableOptions(
  options: DownloadOption[],
  tableArtifacts: TableArtifact[],
  taskId: string,
): void {
  if (tableArtifacts.length === 0) return;

  if (tableArtifacts.length <= TABLE_COMBINE_THRESHOLD) {
    for (const table of tableArtifacts) {
      const tableName = deriveTableName(table);
      options.push({
        label: `Download CSV: ${tableName}`,
        icon: "\u{1F4CA}",
        action: () => {
          const csv = generateCsv(table.headers, table.rows);
          const safeName = sanitizeFilename(tableName);
          downloadFile(csv, `${taskId}-${safeName}.csv`, "text/csv;charset=utf-8");
        },
      });
    }
    return;
  }

  options.push({
    label: "Download CSV (combined)",
    icon: "\u{1F4CA}",
    action: () => {
      const sections = tableArtifacts.map((table) => {
        const name = deriveTableName(table);
        return `# ${name}\r\n` + generateCsv(table.headers, table.rows);
      });
      downloadFile(sections.join("\r\n"), `${taskId}-tables.csv`, "text/csv;charset=utf-8");
    },
  });
}

/** Builds the API download URL for a single attachment. */
function attachmentUrl(taskId: string, s3Key: string): string {
  return `/api/task/${encodeURIComponent(taskId)}/attachment/${encodeURIComponent(s3Key)}`;
}

/** Adds download options for S3 attachments. */
function addAttachmentOptions(
  options: DownloadOption[],
  taskId: string,
  attachments?: AttachmentMeta[],
): void {
  if (!attachments || attachments.length === 0) return;

  // "Download All Attachments (.zip)" when 2+ files
  if (attachments.length >= 2) {
    options.push({
      label: "Download All Attachments (.zip)",
      icon: "\u{1F4E6}",
      action: async () => {
        const { downloadZip } = await import("./download-zip");
        const files = await Promise.all(
          attachments.map(async (att) => {
            const resp = await fetch(attachmentUrl(taskId, att.s3_key));
            const blob = await resp.blob();
            return { filename: att.filename, content: blob };
          }),
        );
        await downloadZip(files, `${taskId}-attachments.zip`);
      },
    });
  }

  for (const att of attachments) {
    const url = attachmentUrl(taskId, att.s3_key);
    options.push({
      label: att.filename,
      icon: "\u{1F4CE}",
      action: () => {
        window.open(url, "_blank");
      },
    });
  }
}

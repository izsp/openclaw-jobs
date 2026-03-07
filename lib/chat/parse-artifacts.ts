/**
 * Core artifact parser — scans markdown line-by-line to extract
 * structured content blocks (code, tables, JSON, HTML, headings).
 */

import type {
  Artifact,
  CodeArtifact,
  HeadingArtifact,
  HtmlArtifact,
  JsonArtifact,
  ParsedResult,
  TableArtifact,
} from "./artifact-types";
import { buildArtifactSummary } from "./artifact-types";
import { inferFilename } from "./infer-filename";
import { parseTable } from "./parse-table";

const HEADING_RE = /^(#{1,6})\s+(.+)$/;
const FENCE_OPEN_RE = /^```(\w*)$/;
const FENCE_CLOSE_RE = /^```$/;
const TABLE_ROW_RE = /^\|.+\|$/;
const TABLE_SEPARATOR_RE = /^\|[\s:-]+(\|[\s:-]+)+\|?$/;

let idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${++idCounter}`;
}

/** Resets the id counter (useful for deterministic tests). */
export function resetIdCounter(): void {
  idCounter = 0;
}

/** Creates a URL-friendly slug from heading text (supports Unicode). */
let slugCounter = 0;
export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return slug || `heading-${++slugCounter}`;
}
/** Resets the slug counter (useful for deterministic tests). */
export function resetSlugCounter(): void {
  slugCounter = 0;
}

/** Attempts to parse a fenced code block as JSON artifact. */
function tryParseJson(code: string): unknown | null {
  try {
    return JSON.parse(code);
  } catch {
    return null;
  }
}

/**
 * Collects consecutive table rows starting from `startIdx`.
 * Returns the raw markdown lines and the end index (exclusive).
 */
function collectTableLines(
  lines: string[],
  startIdx: number,
): { tableLines: string[]; endIdx: number } {
  const tableLines: string[] = [];
  let i = startIdx;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (TABLE_ROW_RE.test(trimmed) || TABLE_SEPARATOR_RE.test(trimmed)) {
      tableLines.push(trimmed);
      i++;
    } else {
      break;
    }
  }
  return { tableLines, endIdx: i };
}

/**
 * Parses markdown content and extracts structured artifacts.
 * Returns artifacts array and a summary of detected content.
 */
export function parseArtifacts(markdown: string): ParsedResult {
  resetIdCounter();
  resetSlugCounter();

  const artifacts: Artifact[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // --- Fenced code block ---
    const fenceMatch = trimmed.match(FENCE_OPEN_RE);
    if (fenceMatch) {
      const language = fenceMatch[1] || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !FENCE_CLOSE_RE.test(lines[i].trim())) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence

      const code = codeLines.join("\n");

      if (language === "json") {
        const parsed = tryParseJson(code);
        if (parsed !== null) {
          const jsonArtifact: JsonArtifact = {
            type: "json",
            id: nextId("json"),
            parsed,
            rawJson: code,
          };
          artifacts.push(jsonArtifact);
          continue;
        }
      }

      if (language === "html") {
        const htmlArtifact: HtmlArtifact = {
          type: "html",
          id: nextId("html"),
          html: code,
        };
        artifacts.push(htmlArtifact);
        continue;
      }

      const codeArtifact: CodeArtifact = {
        type: "code",
        id: nextId("code"),
        language,
        code,
        inferredFilename: inferFilename(language, code),
      };
      artifacts.push(codeArtifact);
      continue;
    }

    // --- Heading ---
    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      const text = headingMatch[2].trim();
      const heading: HeadingArtifact = {
        type: "heading",
        id: nextId("heading"),
        level,
        text,
        slug: slugify(text),
      };
      artifacts.push(heading);
      i++;
      continue;
    }

    // --- Markdown table ---
    if (TABLE_ROW_RE.test(trimmed)) {
      const { tableLines, endIdx } = collectTableLines(lines, i);
      if (tableLines.length >= 2) {
        const rawMarkdown = tableLines.join("\n");
        const parsed = parseTable(rawMarkdown);
        if (parsed) {
          const tableArtifact: TableArtifact = {
            type: "table",
            id: nextId("table"),
            headers: parsed.headers,
            rows: parsed.rows,
            rawMarkdown,
          };
          artifacts.push(tableArtifact);
          i = endIdx;
          continue;
        }
      }
    }

    i++;
  }

  const summary = buildArtifactSummary(artifacts, markdown);
  return { artifacts, summary };
}

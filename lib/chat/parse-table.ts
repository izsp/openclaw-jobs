/**
 * Parses a markdown table string into structured headers and rows.
 */

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

/** Splits a markdown table row into cells, trimming whitespace. */
function splitRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Returns true if the line is a markdown table separator (e.g., |---|---|). */
function isSeparatorRow(line: string): boolean {
  return /^\|?[\s:-]+(\|[\s:-]+)+\|?$/.test(line);
}

/**
 * Parses markdown table text into { headers, rows }.
 * Returns null if the input is not a valid markdown table.
 */
export function parseTable(tableMarkdown: string): ParsedTable | null {
  const lines = tableMarkdown
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return null;

  // First line must contain pipe characters
  if (!lines[0].includes("|")) return null;

  // Second line must be separator
  if (!isSeparatorRow(lines[1])) return null;

  const headers = splitRow(lines[0]);
  if (headers.length === 0) return null;

  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    if (!lines[i].includes("|")) continue;
    const cells = splitRow(lines[i]);
    // Pad or trim to match header count
    while (cells.length < headers.length) cells.push("");
    rows.push(cells.slice(0, headers.length));
  }

  return { headers, rows };
}

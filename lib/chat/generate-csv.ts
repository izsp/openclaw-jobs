/**
 * CSV generation utility with proper escaping and Excel compatibility.
 * Produces RFC 4180-compliant CSV with a UTF-8 BOM prefix so that
 * Excel correctly interprets Unicode characters.
 */

/** UTF-8 Byte Order Mark for Excel compatibility. */
const UTF8_BOM = "\uFEFF";

/**
 * Escapes a single CSV cell value according to RFC 4180.
 * Wraps the value in double quotes if it contains commas,
 * double quotes, or newline characters.
 * @param cell - The raw cell value to escape.
 * @returns The escaped cell string safe for CSV output.
 */
function escapeCsvCell(cell: string): string {
  if (
    cell.includes(",") ||
    cell.includes('"') ||
    cell.includes("\n") ||
    cell.includes("\r")
  ) {
    const escaped = cell.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return cell;
}

/**
 * Converts a single row of values into a CSV line.
 * @param row - Array of cell values for one row.
 * @returns A comma-separated string with properly escaped cells.
 */
function rowToCsvLine(row: string[]): string {
  return row.map(escapeCsvCell).join(",");
}

/**
 * Converts table headers and rows to a CSV string.
 * Includes a UTF-8 BOM prefix so Excel properly reads Unicode content.
 * @param headers - Column header names.
 * @param rows - Two-dimensional array of cell values.
 * @returns A complete CSV string ready for file download.
 */
export function generateCsv(headers: string[], rows: string[][]): string {
  const headerLine = rowToCsvLine(headers);
  const dataLines = rows.map(rowToCsvLine);
  return UTF8_BOM + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}

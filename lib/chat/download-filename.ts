/**
 * Filename derivation and sanitization utilities for download options.
 */

import type { CodeArtifact, TableArtifact } from "./artifact-types";

/**
 * Derives a human-readable name for a table using the first header
 * or a fallback based on column count.
 */
export function deriveTableName(table: TableArtifact): string {
  if (table.headers.length > 0 && table.headers[0].trim().length > 0) {
    return table.headers[0].trim();
  }
  return `Table (${table.headers.length} cols)`;
}

/**
 * Sanitizes a string for use as part of a filename.
 * Replaces non-alphanumeric characters (except hyphens) with hyphens.
 */
export function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Builds ZIP file entries from code artifacts, deduplicating filenames
 * by appending a numeric suffix when collisions occur.
 */
export function buildCodeZipEntries(
  codeArtifacts: CodeArtifact[],
): Array<{ filename: string; content: string }> {
  const usedNames = new Set<string>();
  return codeArtifacts.map((artifact, index) => {
    let name = artifact.inferredFilename ?? `file-${index + 1}.txt`;
    if (usedNames.has(name)) {
      const dot = name.lastIndexOf(".");
      const base = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      name = `${base}-${index + 1}${ext}`;
    }
    usedNames.add(name);
    return { filename: name, content: artifact.code };
  });
}

/**
 * Type definitions for the artifact detection system.
 * Artifacts are structured content blocks extracted from markdown results.
 */

export type ArtifactType = "code" | "table" | "json" | "html" | "heading";

export interface CodeArtifact {
  type: "code";
  id: string;
  language: string;
  code: string;
  inferredFilename: string | null;
}

export interface TableArtifact {
  type: "table";
  id: string;
  headers: string[];
  rows: string[][];
  rawMarkdown: string;
}

export interface JsonArtifact {
  type: "json";
  id: string;
  parsed: unknown;
  rawJson: string;
}

export interface HtmlArtifact {
  type: "html";
  id: string;
  html: string;
}

export interface HeadingArtifact {
  type: "heading";
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  slug: string;
}

export type Artifact =
  | CodeArtifact
  | TableArtifact
  | JsonArtifact
  | HtmlArtifact
  | HeadingArtifact;

export interface ArtifactSummary {
  codeBlocks: number;
  tables: number;
  jsonBlocks: number;
  htmlBlocks: number;
  headings: number;
  totalArtifacts: number;
  estimatedReadingMinutes: number;
}

export interface ParsedResult {
  artifacts: Artifact[];
  summary: ArtifactSummary;
}

/** Estimates reading time based on word count (200 wpm average). */
function estimateReadingMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Builds an ArtifactSummary from the detected artifacts and raw markdown. */
export function buildArtifactSummary(
  artifacts: Artifact[],
  markdown: string,
): ArtifactSummary {
  let codeBlocks = 0;
  let tables = 0;
  let jsonBlocks = 0;
  let htmlBlocks = 0;
  let headings = 0;

  for (const a of artifacts) {
    switch (a.type) {
      case "code": codeBlocks++; break;
      case "table": tables++; break;
      case "json": jsonBlocks++; break;
      case "html": htmlBlocks++; break;
      case "heading": headings++; break;
    }
  }

  return {
    codeBlocks,
    tables,
    jsonBlocks,
    htmlBlocks,
    headings,
    totalArtifacts: codeBlocks + tables + jsonBlocks + htmlBlocks,
    estimatedReadingMinutes: estimateReadingMinutes(markdown),
  };
}

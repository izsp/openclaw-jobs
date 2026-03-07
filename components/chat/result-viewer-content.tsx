"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Artifact } from "@/lib/chat/artifact-types";
import { extractTextFromNode, extractTableData } from "@/lib/chat/extract-table-data";
import { CodeBlock } from "./code-block";
import { TableViewer } from "./viewers/table-viewer";
import { JsonViewer } from "./viewers/json-viewer";
import { HtmlPreview } from "./viewers/html-preview";

interface ResultViewerContentProps {
  content: string;
  artifacts: Artifact[];
  /** Output format from worker (e.g. "markdown", "html", "text"). */
  format?: string;
}

/** Try parsing JSON from a code string. */
function tryParseJson(code: string): unknown | null {
  try {
    return JSON.parse(code);
  } catch {
    return null;
  }
}

/** Creates a URL-friendly slug from text (supports Unicode). */
let slugCounter = 0;
function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  return slug || `heading-${++slugCounter}`;
}

let viewerId = 0;

/** Full markdown rendering for the full-screen viewer with embedded artifact viewers. */
export function ResultViewerContent({ content, format }: ResultViewerContentProps) {
  viewerId = 0;
  slugCounter = 0;

  if (format === "html") {
    return (
      <div className="px-6 py-4">
        <HtmlPreview html={content} id="viewer-html" />
      </div>
    );
  }

  return (
    <div className="px-6 py-4 text-sm leading-relaxed text-content">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const match = className?.match(/language-(\w+)/);
            const codeStr = String(children).replace(/\n$/, "");
            if (!match) {
              return (
                <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-accent">
                  {children}
                </code>
              );
            }
            const lang = match[1];
            const aid = `viewer-${++viewerId}`;
            if (lang === "json") {
              const parsed = tryParseJson(codeStr);
              if (parsed !== null) {
                return (
                  <div data-artifact-id={`json-${viewerId}`}>
                    <JsonViewer data={parsed} rawJson={codeStr} id={aid} />
                  </div>
                );
              }
            }
            if (lang === "html") {
              return (
                <div data-artifact-id={`html-${viewerId}`}>
                  <HtmlPreview html={codeStr} id={aid} />
                </div>
              );
            }
            return (
              <div data-artifact-id={`code-${viewerId}`}>
                <CodeBlock language={lang} code={codeStr} />
              </div>
            );
          },
          table: ({ children }) => (
            <div data-artifact-id={`table-${++viewerId}`}>
              <TableFromChildren id={`tbl-${viewerId}`}>
                {children}
              </TableFromChildren>
            </div>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-accent underline hover:text-accent" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="text-content-secondary">{children}</li>,
          h1: ({ children }) => {
            const slug = slugify(extractTextFromNode(children));
            return <h1 id={slug} className="mb-2 mt-4 text-lg font-bold text-content">{children}</h1>;
          },
          h2: ({ children }) => {
            const slug = slugify(extractTextFromNode(children));
            return <h2 id={slug} className="mb-1.5 mt-3 text-base font-bold text-content">{children}</h2>;
          },
          h3: ({ children }) => {
            const slug = slugify(extractTextFromNode(children));
            return <h3 id={slug} className="mb-1 mt-2 text-sm font-semibold text-content">{children}</h3>;
          },
          h4: ({ children }) => {
            const slug = slugify(extractTextFromNode(children));
            return <h4 id={slug} className="mb-1 mt-2 text-sm font-medium text-content">{children}</h4>;
          },
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-edge-strong pl-3 text-content-secondary italic">{children}</blockquote>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

/** Extracts table data from react-markdown children and renders TableViewer. */
function TableFromChildren({ children, id }: { children: React.ReactNode; id: string }) {
  const { headers, rows } = extractTableData(children);
  if (headers.length > 0) {
    return <TableViewer headers={headers} rows={rows} id={id} />;
  }
  return (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-xs">{children}</table>
    </div>
  );
}

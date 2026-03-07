"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./code-block";
import { TableViewer } from "./viewers/table-viewer";
import { JsonViewer } from "./viewers/json-viewer";
import { HtmlPreview } from "./viewers/html-preview";
import { extractTableData } from "@/lib/chat/extract-table-data";

interface ResultContentProps {
  content: string;
  /** Output format from worker (e.g. "markdown", "html", "text"). */
  format?: string;
}

/** Try parsing a JSON code block's content. */
function tryParseJson(code: string): unknown | null {
  try {
    return JSON.parse(code);
  } catch {
    return null;
  }
}

let viewerIdCounter = 0;

/** Enhanced markdown rendering with rich artifact viewers. */
export function ResultContent({ content, format }: ResultContentProps) {
  viewerIdCounter = 0;

  // WHY: When format is "html", the entire content is raw HTML (not markdown with
  // embedded HTML blocks). Render it in an iframe preview instead of markdown parser.
  if (format === "html") {
    return (
      <div className="px-4 py-3">
        <HtmlPreview html={content} id="result-html" />
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden px-2.5 py-3 text-sm leading-relaxed text-content md:px-4">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const match = className?.match(/language-(\w+)/);
            const codeStr = String(children).replace(/\n$/, "");
            if (match) {
              const lang = match[1];
              if (lang === "json") {
                const parsed = tryParseJson(codeStr);
                if (parsed !== null) {
                  return (
                    <JsonViewer
                      data={parsed}
                      rawJson={codeStr}
                      id={`json-inline-${++viewerIdCounter}`}
                    />
                  );
                }
              }
              if (lang === "html") {
                return (
                  <HtmlPreview
                    html={codeStr}
                    id={`html-inline-${++viewerIdCounter}`}
                  />
                );
              }
              return <CodeBlock language={lang} code={codeStr} />;
            }
            return (
              <code className="rounded bg-surface-alt px-1.5 py-0.5 text-xs text-accent">
                {children}
              </code>
            );
          },
          table: ({ children }) => (
            <TableViewerFromMd id={`table-inline-${++viewerIdCounter}`}>
              {children}
            </TableViewerFromMd>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-accent underline hover:text-accent"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>
          ),
          li: ({ children }) => <li className="text-content-secondary">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-1 mt-3 text-base font-bold text-content">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 mt-2 text-sm font-bold text-content">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1 mt-2 text-sm font-semibold text-content">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-edge-strong pl-3 text-content-secondary italic">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}

/** Wrapper that extracts table content from react-markdown children and renders TableViewer. */
function TableViewerFromMd({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
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

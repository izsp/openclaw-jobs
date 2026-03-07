"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ResultMetadata } from "@/lib/chat/chat-types";

interface ResultPreviewProps {
  content: string;
  meta: ResultMetadata;
  onOpen: () => void;
}

/** Formats seconds into human-readable duration. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Compact preview card for task results in the chat flow.
 * Fixed height, no inner scroll. Shows first few lines with gradient fade.
 * Clicking opens the full result in side panel (desktop) or full screen (mobile).
 */
export function ResultPreview({ content, meta, onOpen }: ResultPreviewProps) {
  const displayName = meta.worker_display_name ?? "Lobster";

  return (
    <div className="flex justify-start">
      <button
        onClick={onOpen}
        className="group w-full max-w-full cursor-pointer rounded-xl border border-edge bg-surface text-left transition-colors hover:border-edge-strong focus:outline-none md:max-w-[85%]"
      >
        {/* Content preview — fixed height, gradient fade */}
        <div className="relative max-h-40 overflow-hidden px-4 pt-4 md:max-h-48">
          <div className="text-sm leading-relaxed text-content">
            <Markdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Strip complex elements in preview — keep it simple
                pre: ({ children }) => (
                  <pre className="my-1.5 rounded bg-code-bg px-2 py-1.5 text-xs text-content-secondary">
                    {children}
                  </pre>
                ),
                code: ({ className, children }) => {
                  if (className?.startsWith("language-")) {
                    return <code className="text-content-secondary">{children}</code>;
                  }
                  return (
                    <code className="rounded bg-code-bg px-1 py-0.5 text-xs text-accent">
                      {children}
                    </code>
                  );
                },
                table: () => (
                  <div className="my-1.5 rounded bg-surface-alt px-2 py-1.5 text-xs text-content-tertiary">
                    [Table]
                  </div>
                ),
                img: () => null,
                a: ({ children }) => (
                  <span className="text-accent">{children}</span>
                ),
                h1: ({ children }) => <h1 className="mt-2 mb-1 text-base font-bold">{children}</h1>,
                h2: ({ children }) => <h2 className="mt-2 mb-1 text-sm font-bold">{children}</h2>,
                h3: ({ children }) => <h3 className="mt-1.5 mb-0.5 text-sm font-semibold">{children}</h3>,
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="my-1 ml-4 list-disc space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-content-secondary">{children}</li>,
                blockquote: ({ children }) => (
                  <blockquote className="my-1 border-l-2 border-edge-strong pl-2 text-content-tertiary italic">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </Markdown>
          </div>
          {/* Gradient fade overlay */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent" />
        </div>

        {/* Footer: metadata + open CTA */}
        <div className="flex items-center gap-2 border-t border-edge px-4 py-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-alt text-[10px]">
            🦞
          </span>
          <span className="text-xs text-content-tertiary">
            {displayName}
          </span>
          <span className="text-xs text-content-tertiary">·</span>
          <span className="text-xs text-content-tertiary">
            {formatDuration(meta.duration_seconds)}
          </span>
          <span className="text-xs text-content-tertiary">·</span>
          <span className="text-xs text-content-tertiary">
            {meta.word_count.toLocaleString()} words
          </span>
          <div className="flex-1" />
          <span className="text-xs font-medium text-content-secondary transition-colors group-hover:text-accent">
            Open →
          </span>
        </div>
      </button>
    </div>
  );
}

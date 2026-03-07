"use client";

import { useEffect, useCallback, useState } from "react";
import type { ResultMetadata } from "@/lib/chat/chat-types";
import { ResultContent } from "./result-content";
import { AttachmentList } from "./viewers/attachment-list";

interface ResultPanelProps {
  content: string;
  meta: ResultMetadata;
  onClose: () => void;
  onCredit: (taskId: string) => Promise<boolean>;
  credited?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Desktop artifact panel — Claude-style.
 * Dark header/footer frame with light content area for readability.
 * Width controlled by parent (resizable via drag handle in chat page).
 */
export function ResultPanel({
  content,
  meta,
  onClose,
  onCredit,
  credited,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [creditState, setCreditState] = useState<"idle" | "loading" | "done">(
    credited ? "done" : "idle",
  );

  const handleEscape = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [handleEscape]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleCredit = useCallback(async () => {
    setCreditState("loading");
    const ok = await onCredit(meta.task_id);
    setCreditState(ok ? "done" : "idle");
  }, [onCredit, meta.task_id]);

  const displayName = meta.worker_display_name ?? "Lobster";

  return (
    <div className="flex h-full w-full animate-slide-in-right flex-col bg-surface">
      {/* Header — dark frame */}
      <div className="flex shrink-0 items-center gap-3 border-b border-edge px-4 py-2.5">
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-content-tertiary transition-colors hover:bg-surface-alt hover:text-content-secondary"
          aria-label="Close panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-xs text-content-secondary">{displayName}</span>
          <span className="text-xs text-content-tertiary">
            {formatDuration(meta.duration_seconds)}
          </span>
          <span className="text-xs text-content-tertiary">
            {meta.word_count.toLocaleString()} words
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="rounded-lg px-2.5 py-1.5 text-xs text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleCredit}
            disabled={creditState !== "idle"}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              creditState === "done"
                ? "text-status-success"
                : "text-content-secondary hover:bg-surface-alt hover:text-content"
            } disabled:opacity-50`}
          >
            {creditState === "done"
              ? "Credited"
              : creditState === "loading"
                ? "..."
                : "Credit"}
          </button>
        </div>
      </div>

      {/* Content — light theme for readability */}
      <div className="artifact-content-light flex-1 overflow-y-auto overscroll-contain bg-page">
        <div className="mx-auto max-w-2xl">
          <ResultContent content={content} format={meta.format} />
          {meta.attachments && meta.attachments.length > 0 && (
            <AttachmentList attachments={meta.attachments} taskId={meta.task_id} />
          )}
        </div>
      </div>
    </div>
  );
}

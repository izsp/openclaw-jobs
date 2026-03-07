"use client";

import { useEffect, useCallback, useState } from "react";
import type { ResultMetadata } from "@/lib/chat/chat-types";
import { ResultContent } from "./result-content";
import { AttachmentList } from "./viewers/attachment-list";

interface ResultSheetProps {
  content: string;
  meta: ResultMetadata;
  onClose: () => void;
  onCredit: (taskId: string) => Promise<boolean>;
  credited?: boolean;
}

/** Formats seconds into human-readable duration. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/**
 * Full-screen mobile reader for task results.
 * Covers the entire viewport — professional document reading experience.
 * Used on screens < lg breakpoint.
 */
export function ResultSheet({
  content,
  meta,
  onClose,
  onCredit,
  credited,
}: ResultSheetProps) {
  const [copied, setCopied] = useState(false);
  const [creditState, setCreditState] = useState<"idle" | "loading" | "done">(
    credited ? "done" : "idle",
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
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
    <div className="fixed inset-0 z-50 flex flex-col bg-page">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-edge px-3 py-2.5">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg p-1.5 text-sm text-content-secondary transition-colors hover:text-content"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="rounded-lg px-2.5 py-1.5 text-xs text-content-secondary transition-colors hover:bg-surface-alt"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Worker info bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-edge px-4 py-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-alt text-[10px]">
          🦞
        </span>
        <span className="text-xs text-content-secondary">{displayName}</span>
        <span className="text-xs text-content-tertiary">·</span>
        <span className="text-xs text-content-tertiary">
          {formatDuration(meta.duration_seconds)}
        </span>
        <span className="text-xs text-content-tertiary">·</span>
        <span className="text-xs text-content-tertiary">
          {meta.word_count.toLocaleString()} words
        </span>
      </div>

      {/* Content — full screen scroll */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto max-w-2xl">
          <ResultContent content={content} format={meta.format} />
          {meta.attachments && meta.attachments.length > 0 && (
            <AttachmentList attachments={meta.attachments} taskId={meta.task_id} />
          )}
        </div>
      </div>

      {/* Bottom bar — credit */}
      <div className="flex shrink-0 items-center justify-between border-t border-edge px-4 py-2.5">
        <span className="text-xs text-content-tertiary">
          {meta.price_cents} 🦐
        </span>
        <button
          onClick={handleCredit}
          disabled={creditState !== "idle"}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            creditState === "done"
              ? "text-status-success"
              : "text-content-secondary hover:bg-surface-alt hover:text-content"
          } disabled:opacity-50`}
        >
          {creditState === "done"
            ? "Credited"
            : creditState === "loading"
              ? "Crediting..."
              : "Request Credit"}
        </button>
      </div>
    </div>
  );
}

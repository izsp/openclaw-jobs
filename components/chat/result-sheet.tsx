"use client";

import { useEffect, useCallback, useState, useRef } from "react";
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
 * Minimal chrome — just content with a thin header.
 * Three-dot menu holds metadata and actions.
 */
export function ResultSheet({
  content,
  meta,
  onClose,
  onCredit,
  credited,
}: ResultSheetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creditState, setCreditState] = useState<"idle" | "loading" | "done">(
    credited ? "done" : "idle",
  );
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setMenuOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleCredit = useCallback(async () => {
    setCreditState("loading");
    setMenuOpen(false);
    const ok = await onCredit(meta.task_id);
    setCreditState(ok ? "done" : "idle");
  }, [onCredit, meta.task_id]);

  const displayName = meta.worker_display_name ?? "Lobster";

  return (
    <div className="fixed inset-0 z-50 flex animate-slide-up flex-col bg-page">
      {/* Header — Back + three-dot menu */}
      <div className="flex shrink-0 items-center justify-between px-3 py-2.5">
        <button
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg p-1.5 text-sm text-content-secondary transition-colors hover:text-content"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>

        {/* Three-dot menu */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-2 text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-edge bg-elevated py-1 shadow-lg">
              {/* Info section */}
              <div className="border-b border-edge px-3 py-2 space-y-0.5">
                <p className="text-xs text-content-secondary">{displayName}</p>
                <p className="text-[11px] text-content-tertiary">
                  {formatDuration(meta.duration_seconds)} · {meta.word_count.toLocaleString()} words · {meta.price_cents} shrimp
                </p>
              </div>
              {/* Actions */}
              <button
                onClick={handleCopy}
                className="w-full px-3 py-2.5 text-left text-sm text-content-secondary transition-colors hover:bg-surface-alt hover:text-content"
              >
                {copied ? "Copied!" : "Copy text"}
              </button>
              <button
                onClick={handleCredit}
                disabled={creditState !== "idle"}
                className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-alt disabled:opacity-50 ${
                  creditState === "done" ? "text-status-success" : "text-content-secondary hover:text-content"
                }`}
              >
                {creditState === "done" ? "Credited" : creditState === "loading" ? "Crediting..." : "Request credit"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content — full screen scroll, no other chrome */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
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

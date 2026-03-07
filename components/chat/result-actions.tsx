"use client";

import { useState, useCallback } from "react";
import type { Artifact } from "@/lib/chat/artifact-types";
import { generateDownloads } from "@/lib/chat/generate-downloads";

interface AttachmentMeta {
  s3_key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
}

interface ResultActionsProps {
  content: string;
  taskId: string;
  artifacts?: Artifact[];
  /** Returns true if credit succeeded, false otherwise. */
  onCredit: (taskId: string) => Promise<boolean>;
  onExpand?: () => void;
  /** Whether the task is already credited. */
  credited?: boolean;
  /** Output format from worker. */
  format?: string;
  /** S3 attachments from task output. */
  attachments?: AttachmentMeta[];
}

/** Action bar with Copy, Download(s), Expand, and Credit buttons. */
export function ResultActions({
  content,
  taskId,
  artifacts,
  onCredit,
  onExpand,
  credited,
  format,
  attachments,
}: ResultActionsProps) {
  const [copied, setCopied] = useState(false);
  const [creditState, setCreditState] = useState<"idle" | "loading" | "done">(
    credited ? "done" : "idle",
  );
  const [showDownloads, setShowDownloads] = useState(false);

  const downloads = artifacts
    ? generateDownloads(artifacts, content, taskId, format, attachments)
    : [];

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleCredit = useCallback(async () => {
    setCreditState("loading");
    const ok = await onCredit(taskId);
    setCreditState(ok ? "done" : "idle");
  }, [onCredit, taskId]);

  const btn = "rounded px-2 py-1 text-[11px] font-medium transition-colors md:px-3 md:py-1.5 md:text-xs";

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-zinc-700/50 px-2.5 py-2 md:gap-2 md:px-4 md:py-2.5">
      <button
        onClick={handleCopy}
        className={`${btn} text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200`}
      >
        {copied ? "Copied!" : "Copy All"}
      </button>

      {/* Download menu */}
      <div className="relative">
        <button
          onClick={() => setShowDownloads((s) => !s)}
          className={`${btn} text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200`}
        >
          Download ▾
        </button>
        {showDownloads && downloads.length > 0 && (
          <div className="absolute bottom-full left-0 z-50 mb-1 min-w-[180px] rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
            {downloads.map((dl) => (
              <button
                key={dl.label}
                onClick={() => {
                  void dl.action();
                  setShowDownloads(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
              >
                <span>{dl.icon}</span>
                <span>{dl.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Expand button */}
      {onExpand && (
        <button
          onClick={onExpand}
          className={`${btn} text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200`}
          title="Open full-screen viewer"
        >
          Expand
        </button>
      )}

      <div className="flex-1" />
      <button
        onClick={handleCredit}
        disabled={creditState !== "idle"}
        className={`${btn} ${
          creditState === "done"
            ? "text-green-400"
            : "text-red-400 hover:bg-red-900/30 hover:text-red-300"
        } disabled:opacity-50`}
      >
        {creditState === "done"
          ? "Credited!"
          : creditState === "loading"
            ? "Crediting..."
            : "Request Credit"}
      </button>
    </div>
  );
}

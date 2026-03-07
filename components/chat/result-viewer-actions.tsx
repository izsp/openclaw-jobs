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

interface ResultViewerActionsProps {
  content: string;
  taskId: string;
  artifacts: Artifact[];
  /** Returns true if credit succeeded, false otherwise. */
  onCredit: (taskId: string) => Promise<boolean>;
  /** Whether the task is already credited. */
  credited?: boolean;
  /** Output format from worker. */
  format?: string;
  /** S3 attachments from task output. */
  attachments?: AttachmentMeta[];
}

/** Bottom action bar for the full-screen viewer with all download options. */
export function ResultViewerActions({
  content,
  taskId,
  artifacts,
  onCredit,
  credited,
  format,
  attachments,
}: ResultViewerActionsProps) {
  const [copied, setCopied] = useState(false);
  const [creditState, setCreditState] = useState<"idle" | "loading" | "done">(
    credited ? "done" : "idle",
  );

  const downloads = generateDownloads(artifacts, content, taskId, format, attachments);

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

  const btn =
    "rounded px-3 py-1.5 text-xs font-medium transition-colors text-content-secondary hover:bg-edge-strong/50 hover:text-content";

  return (
    <div className="flex items-center gap-2 border-t border-edge px-5 py-3">
      <button onClick={handleCopy} className={btn}>
        {copied ? "Copied!" : "Copy All"}
      </button>

      {downloads.map((dl) => (
        <button
          key={dl.label}
          onClick={() => void dl.action()}
          className={btn}
        >
          {dl.icon} {dl.label}
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={handleCredit}
        disabled={creditState !== "idle"}
        className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
          creditState === "done"
            ? "text-status-success"
            : "text-status-error hover:bg-status-error/10/30 hover:text-red-300"
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

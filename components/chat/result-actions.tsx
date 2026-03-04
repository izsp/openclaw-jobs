"use client";

import { useState, useCallback } from "react";

interface ResultActionsProps {
  content: string;
  taskId: string;
  onCredit: (taskId: string) => void;
}

/** Triggers a browser download of a markdown file. */
function downloadMarkdown(content: string, taskId: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${taskId}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Action bar with Copy, Download, and Credit buttons. */
export function ResultActions({ content, taskId, onCredit }: ResultActionsProps) {
  const [copied, setCopied] = useState(false);
  const [creditState, setCreditState] = useState<"idle" | "loading" | "done">("idle");

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const handleDownload = useCallback(() => {
    downloadMarkdown(content, taskId);
  }, [content, taskId]);

  const handleCredit = useCallback(() => {
    setCreditState("loading");
    onCredit(taskId);
    // Show confirmed state after a short delay (API is async)
    setTimeout(() => setCreditState("done"), 1000);
  }, [onCredit, taskId]);

  const buttonClass =
    "rounded px-3 py-1.5 text-xs font-medium transition-colors";

  return (
    <div className="flex items-center gap-2 border-t border-zinc-700/50 px-4 py-2.5">
      <button
        onClick={handleCopy}
        className={`${buttonClass} text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200`}
      >
        {copied ? "Copied!" : "Copy All"}
      </button>
      <button
        onClick={handleDownload}
        className={`${buttonClass} text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200`}
      >
        Download .md
      </button>
      <div className="flex-1" />
      <button
        onClick={handleCredit}
        disabled={creditState !== "idle"}
        className={`${buttonClass} ${
          creditState === "done"
            ? "text-green-400"
            : "text-red-400 hover:bg-red-900/30 hover:text-red-300"
        } disabled:opacity-50`}
      >
        {creditState === "done" ? "Credited!" : creditState === "loading" ? "Crediting..." : "Request Credit"}
      </button>
    </div>
  );
}

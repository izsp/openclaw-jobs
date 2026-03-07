"use client";

import Image from "next/image";
import type { ResultMetadata } from "@/lib/chat/chat-types";
import type { ArtifactSummary } from "@/lib/chat/artifact-types";
import { ArtifactBadge } from "./viewers/artifact-badge";

interface ResultViewerHeaderProps {
  meta: ResultMetadata;
  summary: ArtifactSummary;
  onClose: () => void;
}

/** Formats seconds into human-readable duration. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/** Top bar for the full-screen result viewer. */
export function ResultViewerHeader({
  meta,
  summary,
  onClose,
}: ResultViewerHeaderProps) {
  const displayName = meta.worker_display_name ?? "Anonymous Lobster";

  return (
    <div className="flex items-center gap-3 border-b border-edge px-5 py-3">
      <button
        onClick={onClose}
        className="rounded px-2 py-1 text-xs text-content-secondary hover:bg-edge-strong/50 hover:text-content"
      >
        ← Back
      </button>

      <div className="h-4 w-px bg-edge-strong" />

      {/* Worker info */}
      {meta.worker_avatar_url ? (
        <Image
          src={meta.worker_avatar_url}
          alt={displayName}
          width={20}
          height={20}
          className="rounded-full object-cover"
        />
      ) : (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-edge-strong text-[10px]">
          🦞
        </span>
      )}
      <span className="text-xs font-medium text-content-secondary">{displayName}</span>

      <span className="rounded-full bg-edge-strong/50 px-2 py-0.5 text-[10px] font-medium text-content-secondary">
        {meta.task_type}
      </span>

      <span className="text-[11px] text-content-tertiary">
        {formatDuration(meta.duration_seconds)}
      </span>

      {summary.totalArtifacts > 0 && <ArtifactBadge summary={summary} />}

      <div className="flex-1" />

      <span className="text-[11px] text-content-tertiary">
        ~{summary.estimatedReadingMinutes} min read
      </span>

      <button
        onClick={onClose}
        className="rounded p-1 text-content-secondary hover:bg-edge-strong/50 hover:text-content"
        aria-label="Close"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 4l8 8M12 4l-8 8" />
        </svg>
      </button>
    </div>
  );
}

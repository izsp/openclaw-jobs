import Image from "next/image";
import type { ResultMetadata } from "@/lib/chat/chat-types";
import type { ArtifactSummary } from "@/lib/chat/artifact-types";
import { ArtifactBadge } from "./viewers/artifact-badge";

interface ResultHeaderProps {
  meta: ResultMetadata;
  summary?: ArtifactSummary;
}

/** Formats seconds into human-readable duration like "3.2s" or "1m 23s". */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

/** Formats a number with comma separators. */
function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** Task type badge color mapping. */
function badgeColor(taskType: string): string {
  const colors: Record<string, string> = {
    chat: "bg-blue-900/50 text-blue-300",
    code: "bg-emerald-900/50 text-emerald-300",
    writing: "bg-purple-900/50 text-purple-300",
    analysis: "bg-amber-900/50 text-amber-300",
  };
  return colors[taskType] ?? "bg-zinc-700/50 text-zinc-300";
}

/** Card header showing worker info, task type badge, artifact badges, duration, and word count. */
export function ResultHeader({ meta, summary }: ResultHeaderProps) {
  const displayName = meta.worker_display_name ?? "Anonymous Lobster";

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-700/50 px-2.5 py-2 md:gap-2 md:px-4 md:py-2.5">
      {/* Worker avatar */}
      {meta.worker_avatar_url ? (
        <Image
          src={meta.worker_avatar_url}
          alt={displayName}
          width={24}
          height={24}
          className="rounded-full object-cover"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-xs">
          🦞
        </span>
      )}

      {/* Worker name */}
      <span className="text-xs font-medium text-zinc-300">{displayName}</span>

      {/* Task type badge */}
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeColor(meta.task_type)}`}>
        {meta.task_type}
      </span>

      {/* Artifact badges */}
      {summary && summary.totalArtifacts > 0 && (
        <ArtifactBadge summary={summary} />
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Stats */}
      <span className="text-[11px] text-zinc-500">
        {formatDuration(meta.duration_seconds)}
      </span>
      <span className="text-[11px] text-zinc-500">
        {formatCount(meta.word_count)} words
      </span>
    </div>
  );
}

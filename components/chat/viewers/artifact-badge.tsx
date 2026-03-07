"use client";

import type { ArtifactSummary } from "@/lib/chat/artifact-types";

interface ArtifactBadgeProps {
  summary: ArtifactSummary;
}

interface BadgeItem {
  count: number;
  label: string;
  color: string;
}

/** Compact badges showing artifact counts: "3 code", "2 tables", etc. */
export function ArtifactBadge({ summary }: ArtifactBadgeProps) {
  const items: BadgeItem[] = [];

  if (summary.codeBlocks > 0) {
    items.push({
      count: summary.codeBlocks,
      label: "code",
      color: "bg-emerald-900/50 text-emerald-400",
    });
  }
  if (summary.tables > 0) {
    items.push({
      count: summary.tables,
      label: summary.tables === 1 ? "table" : "tables",
      color: "bg-blue-900/50 text-status-active",
    });
  }
  if (summary.jsonBlocks > 0) {
    items.push({
      count: summary.jsonBlocks,
      label: "JSON",
      color: "bg-amber-900/50 text-amber-400",
    });
  }
  if (summary.htmlBlocks > 0) {
    items.push({
      count: summary.htmlBlocks,
      label: "HTML",
      color: "bg-pink-900/50 text-pink-400",
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {items.map((item) => (
        <span
          key={item.label}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${item.color}`}
        >
          {item.count} {item.label}
        </span>
      ))}
    </div>
  );
}

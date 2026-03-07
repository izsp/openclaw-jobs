"use client";

import type { Artifact, CodeArtifact, TableArtifact } from "@/lib/chat/artifact-types";
import { DocumentOutline } from "./viewers/document-outline";

interface ResultViewerSidebarProps {
  artifacts: Artifact[];
  scrollContainerId: string;
  onArtifactClick?: (id: string) => void;
}

/** Left sidebar: document outline + artifact file/table list. */
export function ResultViewerSidebar({
  artifacts,
  scrollContainerId,
  onArtifactClick,
}: ResultViewerSidebarProps) {
  const headings = artifacts.filter((a) => a.type === "heading");
  const codeFiles = artifacts.filter((a): a is CodeArtifact => a.type === "code");
  const tables = artifacts.filter((a): a is TableArtifact => a.type === "table");

  const handleClick = (id: string) => {
    onArtifactClick?.(id);
    const container = document.getElementById(scrollContainerId);
    const el = container?.querySelector(`[data-artifact-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex w-48 flex-col gap-4 overflow-y-auto border-r border-zinc-700/50 p-3">
      <DocumentOutline
        headings={headings}
        scrollContainerId={scrollContainerId}
      />

      {codeFiles.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Files
          </div>
          <div className="space-y-0.5">
            {codeFiles.map((f) => (
              <button
                key={f.id}
                onClick={() => handleClick(f.id)}
                className="block w-full truncate rounded px-2 py-1 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                title={f.inferredFilename ?? `${f.language} code`}
              >
                {f.inferredFilename ?? `${f.language} snippet`}
              </button>
            ))}
          </div>
        </div>
      )}

      {tables.length > 0 && (
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Tables
          </div>
          <div className="space-y-0.5">
            {tables.map((t, i) => (
              <button
                key={t.id}
                onClick={() => handleClick(t.id)}
                className="block w-full truncate rounded px-2 py-1 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                title={t.headers.join(", ")}
              >
                Table {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

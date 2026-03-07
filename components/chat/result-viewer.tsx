"use client";

import { useEffect, useCallback } from "react";
import type { ResultMetadata } from "@/lib/chat/chat-types";
import type { ParsedResult } from "@/lib/chat/artifact-types";
import { ResultViewerHeader } from "./result-viewer-header";
import { ResultViewerSidebar } from "./result-viewer-sidebar";
import { ResultViewerContent } from "./result-viewer-content";
import { ResultViewerActions } from "./result-viewer-actions";
import { AttachmentList } from "./viewers/attachment-list";

interface ResultViewerProps {
  content: string;
  meta: ResultMetadata;
  parsed: ParsedResult;
  onClose: () => void;
  onCredit: (taskId: string) => Promise<boolean>;
  credited?: boolean;
}

const SCROLL_CONTAINER_ID = "result-viewer-scroll";

/** Full-screen modal viewer for task results — the "delivery workbench". */
export function ResultViewer({
  content,
  meta,
  parsed,
  onClose,
  onCredit,
  credited,
}: ResultViewerProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape]);

  const hasSidebar =
    parsed.artifacts.some((a) => a.type === "heading") ||
    parsed.artifacts.some((a) => a.type === "code") ||
    parsed.artifacts.some((a) => a.type === "table");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-alt">
      <ResultViewerHeader
        meta={meta}
        summary={parsed.summary}
        onClose={onClose}
      />

      <div className="flex flex-1 overflow-hidden">
        {hasSidebar && (
          <ResultViewerSidebar
            artifacts={parsed.artifacts}
            scrollContainerId={SCROLL_CONTAINER_ID}
          />
        )}

        <div
          id={SCROLL_CONTAINER_ID}
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-3xl">
            <ResultViewerContent
              content={content}
              artifacts={parsed.artifacts}
              format={meta.format}
            />
            {meta.attachments && meta.attachments.length > 0 && (
              <AttachmentList attachments={meta.attachments} taskId={meta.task_id} />
            )}
          </div>
        </div>
      </div>

      <ResultViewerActions
        content={content}
        taskId={meta.task_id}
        artifacts={parsed.artifacts}
        onCredit={onCredit}
        credited={credited}
        format={meta.format}
        attachments={meta.attachments}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/chat/chat-types";
import { useParsedResult } from "@/lib/hooks/use-parsed-result";
import { ResultHeader } from "./result-header";
import { ResultContent } from "./result-content";
import { ResultActions } from "./result-actions";
import { ResultViewer } from "./result-viewer";
import { AttachmentList } from "./viewers/attachment-list";

interface TaskResultCardProps {
  message: ChatMessage;
  onCredit: (taskId: string) => Promise<boolean>;
  /** Whether the task is already credited (from conversation status). */
  credited?: boolean;
}

/**
 * Structured result card for completed task output.
 * Renders header (worker info, stats, artifact badges), enhanced markdown content,
 * and action bar (copy, download, expand, credit).
 */
export function TaskResultCard({ message, onCredit, credited }: TaskResultCardProps) {
  const meta = message.result_meta;
  const [expanded, setExpanded] = useState(false);
  const parsed = useParsedResult(message.content);

  if (!meta) return null;

  return (
    <>
      <div className="flex justify-start">
        <div className="flex max-h-[70vh] w-full max-w-full flex-col overflow-hidden rounded-xl border border-edge bg-surface-alt md:max-w-[90%]">
          <ResultHeader meta={meta} summary={parsed.summary} />
          <div className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
            <ResultContent content={message.content} format={meta.format} />
          </div>
          {meta.attachments && meta.attachments.length > 0 && (
            <AttachmentList attachments={meta.attachments} taskId={meta.task_id} />
          )}
          <ResultActions
            content={message.content}
            taskId={meta.task_id}
            artifacts={parsed.artifacts}
            onCredit={onCredit}
            onExpand={() => setExpanded(true)}
            credited={credited}
            format={meta.format}
            attachments={meta.attachments}
          />
        </div>
      </div>
      {expanded && (
        <ResultViewer
          content={message.content}
          meta={meta}
          parsed={parsed}
          onClose={() => setExpanded(false)}
          onCredit={onCredit}
          credited={credited}
        />
      )}
    </>
  );
}

"use client";

import type { ChatMessage } from "@/lib/chat/chat-types";
import { ResultHeader } from "./result-header";
import { ResultContent } from "./result-content";
import { ResultActions } from "./result-actions";

interface TaskResultCardProps {
  message: ChatMessage;
  onCredit: (taskId: string) => void;
}

/**
 * Structured result card for completed task output.
 * Renders header (worker info, stats), enhanced markdown content,
 * and action bar (copy, download, credit).
 */
export function TaskResultCard({ message, onCredit }: TaskResultCardProps) {
  const meta = message.result_meta;
  if (!meta) return null;

  return (
    <div className="flex justify-start">
      <div className="flex max-h-[70vh] max-w-[90%] flex-col overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/80">
        <ResultHeader meta={meta} />
        <div className="flex-1 overflow-y-auto">
          <ResultContent content={message.content} />
        </div>
        <ResultActions
          content={message.content}
          taskId={meta.task_id}
          onCredit={onCredit}
        />
      </div>
    </div>
  );
}

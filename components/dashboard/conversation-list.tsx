"use client";

import Link from "next/link";
import type { ConversationSummary } from "@/lib/chat/chat-types";

interface ConversationListProps {
  conversations: ConversationSummary[];
  onSelect: (id: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-status-pending",
  assigned: "bg-status-active",
  completed: "bg-status-success",
  failed: "bg-status-error",
  expired: "bg-content-tertiary",
  credited: "bg-status-success",
};

export function ConversationList({ conversations, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-edge bg-surface p-6 text-center">
        <p className="mt-2 text-sm text-content-secondary">No tasks yet</p>
        <p className="mt-1 text-xs text-content-tertiary">
          Submit your first task to see results here
        </p>
        <Link
          href="/chat"
          className="mt-4 inline-block rounded-lg bg-content px-4 py-2 text-xs font-medium text-page transition-opacity hover:opacity-90"
        >
          Start a Task
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-surface">
      <h2 className="border-b border-edge px-4 py-3 text-sm font-medium text-content-secondary">
        Recent Tasks
      </h2>
      <div className="divide-y divide-edge">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-alt"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[conv.task_status ?? ""] ?? "bg-content-tertiary"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-content">
                {conv.preview || "Empty conversation"}
              </p>
              <p className="mt-0.5 text-xs text-content-tertiary">
                {conv.message_count} messages &middot;{" "}
                {new Date(conv.updated_at).toLocaleDateString()}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

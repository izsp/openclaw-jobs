"use client";

import type { ConversationSummary } from "@/lib/chat/chat-types";

interface ConversationListProps {
  conversations: ConversationSummary[];
  onSelect: (id: string) => void;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-yellow-500",
  assigned: "bg-blue-400",
  completed: "bg-green-400",
  failed: "bg-red-400",
  expired: "bg-zinc-500",
  credited: "bg-green-400",
};

export function ConversationList({ conversations, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-center">
        <p className="text-sm text-zinc-500">No conversations yet</p>
        <p className="mt-1 text-xs text-zinc-600">
          Start chatting to see your task history here
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-medium text-zinc-400">
        Recent Tasks
      </h2>
      <div className="divide-y divide-zinc-800">
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/50"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[conv.task_status ?? ""] ?? "bg-zinc-600"}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-200">
                {conv.preview || "Empty conversation"}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600">
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

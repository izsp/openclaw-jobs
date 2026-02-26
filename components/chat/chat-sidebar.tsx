/**
 * Sidebar for the /chat page showing conversation history.
 * Allows switching between conversations and starting new ones.
 */
"use client";

import type { ConversationSummary } from "@/lib/chat/chat-types";

const STATUS_LABEL: Record<string, { color: string; text: string }> = {
  pending: { color: "text-yellow-500", text: "Pending" },
  assigned: { color: "text-blue-400", text: "Working" },
  completed: { color: "text-green-400", text: "Done" },
  failed: { color: "text-red-400", text: "Failed" },
  expired: { color: "text-zinc-500", text: "Expired" },
  credited: { color: "text-green-400", text: "Credited" },
};

interface ChatSidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-orange-500 hover:text-orange-500"
        >
          <PlusIcon />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-zinc-600">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-0.5 px-2">
            {conversations.map((conv) => {
              const isActive = conv.id === activeId;
              const status = STATUS_LABEL[conv.task_status ?? ""];
              return (
                <button
                  key={conv.id}
                  onClick={() => onSelect(conv.id)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                    isActive
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <p className="truncate text-sm">
                    {conv.preview || "Empty conversation"}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-600">
                    <span>{conv.message_count} msgs</span>
                    {status && (
                      <span className={status.color}>{status.text}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

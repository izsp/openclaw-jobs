/**
 * Sidebar for the /chat page showing conversation history.
 * Allows switching between conversations, starting new ones, and deleting.
 */
"use client";

import type { ConversationSummary } from "@/lib/chat/chat-types";

const STATUS_LABEL: Record<string, { color: string; text: string }> = {
  pending: { color: "text-status-pending", text: "Pending" },
  assigned: { color: "text-status-active", text: "Working" },
  completed: { color: "text-status-success", text: "Done" },
  failed: { color: "text-status-error", text: "Failed" },
  expired: { color: "text-content-tertiary", text: "Expired" },
  credited: { color: "text-status-success", text: "Credited" },
};

interface ChatSidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete?: (id: string) => void;
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
}: ChatSidebarProps) {
  return (
    <div className="flex h-full w-[280px] flex-col border-r border-edge bg-elevated md:w-64">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-edge-strong px-3 py-2.5 text-sm font-medium text-content-secondary transition-colors hover:bg-surface hover:text-content"
        >
          <PlusIcon />
          New Chat
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-content-tertiary">
            No conversations yet
          </p>
        ) : (
          <div className="space-y-0.5 px-2">
            {conversations.map((conv) => {
              const isActive = conv.id === activeId;
              const status = STATUS_LABEL[conv.task_status ?? ""];
              return (
                <div
                  key={conv.id}
                  className={`group relative rounded-lg transition-colors ${
                    isActive
                      ? "bg-surface text-content"
                      : "text-content-secondary hover:bg-surface hover:text-content"
                  }`}
                >
                  <button
                    onClick={() => onSelect(conv.id)}
                    className="w-full px-3 py-2.5 text-left"
                  >
                    <p className="truncate pr-6 text-sm">
                      {conv.preview || "Empty conversation"}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-content-tertiary">
                      <span>{conv.message_count} {conv.message_count === 1 ? "msg" : "msgs"}</span>
                      {status && (
                        <span className={status.color}>{status.text}</span>
                      )}
                    </div>
                  </button>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-content-tertiary opacity-0 transition-opacity hover:text-status-error group-hover:opacity-100"
                      title="Delete conversation"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
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

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}

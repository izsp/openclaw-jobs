"use client";

import { useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { TaskStatusBar } from "./task-status-bar";
import { SignInPrompt } from "./sign-in-prompt";
import { useChat } from "@/lib/hooks/use-chat";
import { useBalance } from "@/lib/hooks/use-balance";
import { DEFAULT_DEPTH_SETTINGS } from "@/lib/chat/depth-types";

interface ChatPanelProps {
  /** ID of conversation to load. Changes trigger load. */
  conversationId?: string | null;
  /** Called when conversation changes (for sidebar sync). */
  onConversationChange?: (id: string | null) => void;
  /** Called when a task example is clicked — fills the input directly. */
  onExampleClick?: (text: string) => void;
  /** Pre-assigned worker ID for directed tasks. */
  assignedWorkerId?: string | null;
  /** Welcome message to display from worker offering. */
  welcomeMessage?: string | null;
}

export function ChatPanel({ conversationId, onConversationChange, assignedWorkerId, welcomeMessage }: ChatPanelProps = {}) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = status === "authenticated";

  const { conversation, sending, polling, error, send, cancel, credit, retry, reset, loadById } = useChat(
    userId,
    assignedWorkerId ? { assignedWorkerId } : undefined,
  );
  const { balance } = useBalance(isAuthenticated);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = conversation?.messages ?? [];
  const onConversationChangeRef = useRef(onConversationChange);
  onConversationChangeRef.current = onConversationChange;

  // Load conversation when conversationId prop changes
  useEffect(() => {
    if (conversationId === undefined) return;
    if (conversationId === null) {
      reset();
    } else {
      loadById(conversationId);
    }
  }, [conversationId, reset, loadById]);

  // Notify parent when conversation ID or task status changes (triggers sidebar refresh)
  const convId = conversation?.id ?? null;
  const convStatus = conversation?.task_status ?? null;
  useEffect(() => {
    onConversationChangeRef.current?.(convId);
  }, [convId, convStatus]);

  const handleCredit = credit;

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages.length]);

  if (status === "loading") {
    return <ChatShell><LoadingState /></ChatShell>;
  }
  if (!isAuthenticated) {
    return <ChatShell><SignInPrompt /></ChatShell>;
  }

  const isBusy = sending || polling;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-none border-0 bg-zinc-900/50 md:min-h-[400px] md:rounded-xl md:border md:border-zinc-800">
      {/* Messages area */}
      <div ref={scrollRef} className="min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-y-contain p-2 md:p-4">
        {messages.length === 0 && !welcomeMessage && (
          <EmptyState
            balanceCents={balance?.amount_cents ?? null}
            onExampleClick={send}
          />
        )}
        {welcomeMessage && messages.length === 0 && (
          <ChatMessage role="assistant" content={welcomeMessage} />
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            resultMeta={msg.result_meta}
            onCredit={handleCredit}
            credited={conversation?.task_status === "credited"}
          />
        ))}
        {isBusy && !["completed", "failed", "expired", "credited"].includes(conversation?.task_status ?? "") && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-400">
              <span className="animate-pulse">
                {sending ? "Submitting task..." : "Lobster is working..."}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-t border-red-900 bg-red-950/50 px-4 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Status + price bar */}
      <TaskStatusBar
        taskStatus={conversation?.task_status ?? null}
        priceCents={conversation?.price_cents ?? null}
        balanceCents={balance?.amount_cents ?? null}
        onCancel={cancel}
        onRetry={retry}
      />

      {/* Input */}
      <div className="border-t border-zinc-800 p-2 md:p-3">
        <ChatInput onSend={send} disabled={isBusy} />
      </div>
    </div>
  );
}

function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-none bg-zinc-900/50 md:min-h-[400px] md:rounded-xl md:border md:border-zinc-800">
      {children}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-sm text-zinc-600 animate-pulse">Loading...</div>
  );
}

const TASK_EXAMPLES = [
  { label: "Competitive analysis", example: "Write a competitive analysis of the top 5 project management tools. Include pricing, features, and a recommendation for a 50-person startup." },
  { label: "Code review", example: "Review my pull request for bugs, security issues, and performance problems. Suggest concrete fixes with code snippets." },
  { label: "Document summary", example: "Summarize this 40-page research paper into a 1-page executive brief with key findings, methodology, and implications." },
  { label: "SQL + data", example: "Write a PostgreSQL query to calculate monthly user churn rate, then explain what the results mean and suggest retention strategies." },
];

interface EmptyStateProps {
  balanceCents: number | null;
  onExampleClick: (text: string) => void;
}

function EmptyState({ balanceCents, onExampleClick }: EmptyStateProps) {
  const hasBalance = balanceCents !== null && balanceCents > 0;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
      {/* Zero-balance onboarding prompt */}
      {!hasBalance && balanceCents !== null && (
        <div className="w-full max-w-lg rounded-lg border border-orange-800/50 bg-orange-950/20 px-4 py-3 text-center">
          <p className="text-sm font-medium text-orange-400">
            Add funds to start submitting tasks
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            First deposit gets a 20% bonus. 100 🦐 = $1.00 USD
          </p>
          <a
            href="/dashboard"
            className="mt-2 inline-block rounded-lg bg-orange-500 px-4 py-2 text-xs font-medium text-zinc-950 transition-colors hover:bg-orange-400"
          >
            Add Funds
          </a>
        </div>
      )}

      <div className="text-center">
        <div className="text-3xl">🦞</div>
        <p className="mt-2 text-sm font-medium text-zinc-300">
          What do you need done?
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Describe the outcome you want. A Lobster will deliver it.
        </p>
        <p className="mt-2 max-w-md text-[11px] leading-relaxed text-zinc-700">
          Tasks are processed by independent AI workers who see the full
          content. Avoid sharing passwords or personal secrets.
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {TASK_EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-left text-xs transition-colors hover:border-orange-500/50 hover:bg-zinc-800"
            onClick={() => onExampleClick(ex.example)}
          >
            <span className="font-medium text-zinc-300">{ex.label}</span>
            <p className="mt-0.5 line-clamp-2 text-zinc-600">{ex.example}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

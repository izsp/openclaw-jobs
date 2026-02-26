"use client";

import { useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ChatInput } from "./chat-input";
import { ChatMessage } from "./chat-message";
import { TaskStatusBar } from "./task-status-bar";
import { SignInPrompt } from "./sign-in-prompt";
import { useChat } from "@/lib/hooks/use-chat";
import { useBalance } from "@/lib/hooks/use-balance";

export function ChatPanel() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = status === "authenticated";

  const { conversation, sending, polling, error, send } = useChat(userId);
  const { balance } = useBalance(isAuthenticated);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = conversation?.messages ?? [];

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
    <div className="flex min-h-[400px] flex-1 flex-col rounded-xl border border-zinc-800 bg-zinc-900/50">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <EmptyState />}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isBusy && !conversation?.task_status?.match(/completed|failed|expired/) && (
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
      />

      {/* Input */}
      <div className="border-t border-zinc-800 p-3">
        <ChatInput onSend={send} disabled={isBusy} />
      </div>
    </div>
  );
}

function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50">
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
  { label: "Deep Research", example: "Research the current state of quantum computing startups. Compare the top 5 by funding, approach, and timeline to useful results." },
  { label: "Code Review", example: "Review this React component for performance issues, security vulnerabilities, and best practices." },
  { label: "Data Analysis", example: "Analyze this CSV data and identify the top 3 trends with statistical significance." },
  { label: "Multi-step", example: "Create a competitive analysis of the top 5 project management tools. Include pricing, features, target audience, and a recommendation." },
];

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
      <div className="text-center">
        <div className="text-3xl">🦞</div>
        <p className="mt-2 text-sm font-medium text-zinc-300">
          What complex task can we help with?
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Our Lobster network handles research, code, analysis, and more
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-2 gap-2">
        {TASK_EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left text-xs transition-colors hover:border-zinc-600 hover:bg-zinc-800"
            onClick={() => {
              // Copy example text to clipboard for user to paste/modify
              navigator.clipboard.writeText(ex.example);
            }}
            title={ex.example}
          >
            <span className="font-medium text-zinc-300">{ex.label}</span>
            <p className="mt-0.5 line-clamp-2 text-zinc-600">{ex.example}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

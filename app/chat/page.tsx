/**
 * Dedicated chat page for authenticated users.
 * Full-screen layout with conversation sidebar + chat panel.
 * Results open in a side panel (desktop) or full-screen sheet (mobile).
 * Supports ?worker=<slug>&offering=<id> for pre-assigned worker chats.
 */
"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ResultPanel } from "@/components/chat/result-panel";
import { ResultSheet } from "@/components/chat/result-sheet";
import { listConversations, deleteConversation } from "@/lib/chat/chat-storage";
import { useBalance } from "@/lib/hooks/use-balance";
import { useWorkerOffering } from "@/lib/hooks/use-worker-offering";
import type { ChatMessage } from "@/lib/chat/chat-types";

export default function ChatPage() {
  return (
    <Suspense fallback={<PageShell />}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = status === "authenticated";
  const { balance } = useBalance(isAuthenticated);

  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");
  const workerSlug = searchParams.get("worker");
  const offeringId = searchParams.get("offering");

  const { workerId, welcomeMessage, loading: offeringLoading } = useWorkerOffering(workerSlug, offeringId);

  // WHY: On refresh without ?id= param, auto-select the most recent
  // conversation so the user doesn't lose context.
  const initialConvId = (() => {
    if (urlId) return urlId;
    if (!userId) return null;
    const convs = listConversations(userId);
    if (convs.length === 0) return null;
    const active = convs.find((c) =>
      c.task_status && !["completed", "failed", "expired", "credited"].includes(c.task_status),
    );
    return active?.id ?? convs[0].id;
  })();

  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId);
  const [sidebarKey, setSidebarKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Result panel state — the message currently being viewed
  const [expandedResult, setExpandedResult] = useState<ChatMessage | null>(null);

  // Keep URL param in sync
  const [prevUrlId, setPrevUrlId] = useState(urlId);
  if (urlId !== prevUrlId) {
    setPrevUrlId(urlId);
    if (urlId && urlId !== activeConvId) {
      setActiveConvId(urlId);
    }
  }

  const handleConversationChange = useCallback((id: string | null) => {
    if (id && id !== activeConvId) {
      setActiveConvId(id);
    }
    setSidebarKey((k) => k + 1);
  }, [activeConvId]);

  // Sync URL with active conversation so refresh preserves state
  useEffect(() => {
    const currentId = new URLSearchParams(window.location.search).get("id");
    if (activeConvId && activeConvId !== currentId) {
      window.history.replaceState(null, "", `/chat?id=${activeConvId}`);
    } else if (!activeConvId && currentId) {
      window.history.replaceState(null, "", "/chat");
    }
  }, [activeConvId]);

  // Close result panel when switching conversations
  useEffect(() => {
    setExpandedResult(null);
  }, [activeConvId]);

  const handleOpenResult = useCallback((message: ChatMessage) => {
    setExpandedResult(message);
  }, []);

  const handleCloseResult = useCallback(() => {
    setExpandedResult(null);
  }, []);

  // Stub credit handler — delegates to the chat hook via the conversation
  const handleCredit = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/task/${encodeURIComponent(taskId)}/credit`, {
        method: "POST",
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  if (status === "loading" || offeringLoading) {
    return <PageShell />;
  }
  if (!isAuthenticated) {
    redirect("/login");
  }

  const conversations = userId ? listConversations(userId) : [];

  function handleNewChat() {
    setActiveConvId(null);
  }

  function handleSelectConversation(id: string) {
    setActiveConvId(id);
    setSidebarOpen(false);
  }

  function handleDeleteConversation(id: string) {
    if (!userId) return;
    deleteConversation(userId, id);
    if (activeConvId === id) {
      setActiveConvId(null);
    }
    setSidebarKey((k) => k + 1);
  }

  const hasPanel = expandedResult !== null;

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-page text-content">
      {/* Compact header */}
      <nav className="flex shrink-0 items-center justify-between overflow-hidden border-b border-edge px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded p-1.5 text-content-tertiary transition-colors hover:text-content-secondary lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="text-base font-bold tracking-tight md:text-lg">
            OpenClaw<span className="text-accent">.jobs</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {balance && (
            <span
              className="rounded-full border border-edge px-2.5 py-0.5 text-xs text-content-secondary md:px-3 md:py-1 md:text-sm"
              title={`$${(balance.amount_cents / 100).toFixed(2)} USD`}
            >
              {balance.amount_cents} 🦐
            </span>
          )}
          <Link
            href="/dashboard"
            className="hidden text-sm text-content-secondary transition-colors hover:text-content sm:inline"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Main area: sidebar + chat + result panel */}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-overlay lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar */}
        <div className={`${
          sidebarOpen ? "fixed inset-y-0 left-0 z-30" : "hidden"
        } lg:relative lg:z-auto lg:block`}>
          <ChatSidebar
            key={sidebarKey}
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onNewChat={() => { handleNewChat(); setSidebarOpen(false); }}
            onDelete={handleDeleteConversation}
          />
        </div>

        {/* Chat panel — shrinks when result panel is open on desktop */}
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col p-1 md:p-4 ${
          hasPanel ? "lg:max-w-[45%]" : ""
        }`}>
          <ChatPanel
            conversationId={activeConvId}
            onConversationChange={handleConversationChange}
            onOpenResult={handleOpenResult}
            assignedWorkerId={workerId}
            welcomeMessage={welcomeMessage}
          />
        </div>

        {/* Desktop: Side panel (lg and up) */}
        {hasPanel && expandedResult.result_meta && (
          <div className="hidden w-[55%] lg:block">
            <ResultPanel
              content={expandedResult.content}
              meta={expandedResult.result_meta}
              onClose={handleCloseResult}
              onCredit={handleCredit}
              credited={false}
            />
          </div>
        )}

        {/* Mobile: Full-screen sheet (below lg) */}
        {hasPanel && expandedResult.result_meta && (
          <div className="lg:hidden">
            <ResultSheet
              content={expandedResult.content}
              meta={expandedResult.result_meta}
              onClose={handleCloseResult}
              onCredit={handleCredit}
              credited={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PageShell() {
  return (
    <div className="flex h-screen items-center justify-center bg-page">
      <div className="text-sm text-content-tertiary animate-pulse">Loading...</div>
    </div>
  );
}

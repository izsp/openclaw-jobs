/**
 * Dedicated chat page for authenticated users.
 * Full-screen layout with conversation sidebar + chat panel.
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
import { listConversations, deleteConversation } from "@/lib/chat/chat-storage";
import { useBalance } from "@/lib/hooks/use-balance";
import { useWorkerOffering } from "@/lib/hooks/use-worker-offering";

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

  // Resolve worker profile + offering when URL params are present
  const { workerId, welcomeMessage, loading: offeringLoading } = useWorkerOffering(workerSlug, offeringId);

  // WHY: On refresh without ?id= param, auto-select the most recent
  // conversation so the user doesn't lose context. Prioritize conversations
  // with active (non-terminal) tasks so polling can resume.
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

  // Keep URL param in sync — if URL changes, update state
  // WHY: Using derived state pattern instead of effect to avoid cascading renders
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
    // Always bump sidebar key so it re-reads localStorage for latest status
    setSidebarKey((k) => k + 1);
  }, [activeConvId]);

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

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Compact header */}
      <nav className="flex shrink-0 items-center justify-between overflow-hidden border-b border-zinc-800 px-3 py-2 md:px-4 md:py-3">
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded p-1.5 text-zinc-500 transition-colors hover:text-zinc-300 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="text-base font-bold tracking-tight md:text-lg">
            OpenClaw<span className="text-orange-500">.jobs</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          {balance && (
            <Link
              href="/dashboard"
              className="rounded-full border border-zinc-700 px-2.5 py-0.5 text-xs text-orange-500 transition-colors hover:border-orange-500 md:px-3 md:py-1 md:text-sm"
              title={`$${(balance.amount_cents / 100).toFixed(2)} USD`}
            >
              {balance.amount_cents} 🦐
            </Link>
          )}
          <Link
            href="/dashboard"
            className="hidden text-sm text-zinc-400 transition-colors hover:text-zinc-200 sm:inline"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Main area: sidebar + chat */}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar: overlay on mobile, inline on desktop */}
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-1 md:p-4">
          <ChatPanel
            conversationId={activeConvId}
            onConversationChange={handleConversationChange}
            assignedWorkerId={workerId}
            welcomeMessage={welcomeMessage}
          />
        </div>
      </div>
    </div>
  );
}

function PageShell() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="text-sm text-zinc-600 animate-pulse">Loading...</div>
    </div>
  );
}

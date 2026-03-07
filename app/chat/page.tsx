/**
 * Dedicated chat page for authenticated users.
 * Mobile: warm light theme. Desktop: dark theme (Claude-style).
 * Results: side panel (desktop) or full-page reader (mobile).
 *
 * URL patterns:
 *   /chat?id=<convId>           — chat view
 *   /chat?id=<convId>&task=<id> — mobile full-page reader
 */
"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ResultPanel } from "@/components/chat/result-panel";
import { ResultReader } from "@/components/chat/result-reader";
import { listConversations, loadConversations, deleteConversation } from "@/lib/chat/chat-storage";
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

function findResultMessage(userId: string, taskId: string): ChatMessage | null {
  const conversations = loadConversations(userId);
  for (const conv of conversations) {
    const msg = conv.messages.find((m) => m.result_meta?.task_id === taskId);
    if (msg) return msg;
  }
  return null;
}

function ChatPageInner() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = status === "authenticated";
  const { balance } = useBalance(isAuthenticated);

  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");
  const urlTaskId = searchParams.get("task");
  const workerSlug = searchParams.get("worker");
  const offeringId = searchParams.get("offering");

  const { workerId, welcomeMessage, loading: offeringLoading } = useWorkerOffering(workerSlug, offeringId);

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
  const [expandedResult, setExpandedResult] = useState<ChatMessage | null>(null);

  // Resizable panel width (percentage, desktop only)
  const [panelWidth, setPanelWidth] = useState(55);
  const dragging = useRef(false);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("task")) return;
    const currentId = params.get("id");
    if (activeConvId && activeConvId !== currentId) {
      window.history.replaceState(null, "", `/chat?id=${activeConvId}`);
    } else if (!activeConvId && currentId) {
      window.history.replaceState(null, "", "/chat");
    }
  }, [activeConvId]);

  useEffect(() => { setExpandedResult(null); }, [activeConvId]);

  const handleOpenResult = useCallback((message: ChatMessage) => {
    if (!message.result_meta) return;
    setExpandedResult(message);
    // Mobile: navigate to reader page
    if (window.innerWidth < 1024) {
      const convId = activeConvId ?? "";
      window.history.pushState(null, "", `/chat?id=${convId}&task=${message.result_meta.task_id}`);
    }
  }, [activeConvId]);

  const handleCloseResult = useCallback(() => {
    setExpandedResult(null);
    const params = new URLSearchParams(window.location.search);
    if (params.get("task")) window.history.back();
  }, []);

  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      if (!params.get("task")) setExpandedResult(null);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Resizable panel drag handler
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;

    function onMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const dx = ev.clientX - startX;
      const vw = window.innerWidth;
      const newWidth = startWidth - (dx / vw) * 100;
      setPanelWidth(Math.min(70, Math.max(30, newWidth)));
    }
    function onUp() {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  const handleCredit = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/task/${encodeURIComponent(taskId)}/credit`, { method: "POST" });
      return res.ok;
    } catch { return false; }
  }, []);

  if (status === "loading" || offeringLoading) return <PageShell />;
  if (!isAuthenticated) redirect("/login");

  // Mobile reader mode
  const readerMessage = urlTaskId && userId
    ? (expandedResult?.result_meta?.task_id === urlTaskId
        ? expandedResult
        : findResultMessage(userId, urlTaskId))
    : null;

  if (readerMessage?.result_meta && urlTaskId) {
    return (
      <ResultReader
        content={readerMessage.content}
        meta={readerMessage.result_meta}
        onClose={handleCloseResult}
        onCredit={handleCredit}
        credited={false}
      />
    );
  }

  // Normal chat mode
  const conversations = userId ? listConversations(userId) : [];
  const hasPanel = expandedResult !== null;

  return (
    <div className="chat-layout flex h-[100dvh] flex-col overflow-hidden bg-page text-content">
      {/* Header */}
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
            OpenClaw<span className="text-content-tertiary">.jobs</span>
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

      {/* Main area */}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        {/* Sidebar */}
        <div className={`${sidebarOpen ? "fixed inset-y-0 left-0 z-30" : "hidden"} lg:relative lg:z-auto lg:block`}>
          <div className="chat-sidebar-dark h-full">
            <ChatSidebar
              key={sidebarKey}
              conversations={conversations}
              activeId={activeConvId}
              onSelect={(id) => { setActiveConvId(id); setSidebarOpen(false); }}
              onNewChat={() => { setActiveConvId(null); setSidebarOpen(false); }}
              onDelete={(id) => {
                if (!userId) return;
                deleteConversation(userId, id);
                if (activeConvId === id) setActiveConvId(null);
                setSidebarKey((k) => k + 1);
              }}
            />
          </div>
        </div>

        {/* Chat panel */}
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col p-1 md:p-4"
          style={hasPanel ? { maxWidth: `${100 - panelWidth}%` } : undefined}
        >
          <ChatPanel
            conversationId={activeConvId}
            onConversationChange={handleConversationChange}
            onOpenResult={handleOpenResult}
            assignedWorkerId={workerId}
            welcomeMessage={welcomeMessage}
          />
        </div>

        {/* Desktop: Resizable artifact panel */}
        {hasPanel && expandedResult.result_meta && (
          <div className="hidden lg:flex" style={{ width: `${panelWidth}%` }}>
            {/* Drag handle */}
            <div
              onMouseDown={handleDragStart}
              className="flex w-1.5 shrink-0 cursor-col-resize items-center justify-center hover:bg-edge/50 active:bg-edge transition-colors"
            >
              <div className="h-8 w-0.5 rounded-full bg-content-tertiary/40" />
            </div>
            {/* Panel */}
            <div className="min-w-0 flex-1">
              <ResultPanel
                content={expandedResult.content}
                meta={expandedResult.result_meta}
                onClose={handleCloseResult}
                onCredit={handleCredit}
                credited={false}
              />
            </div>
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

/**
 * Dedicated chat page for authenticated users.
 * Full-screen layout with conversation sidebar + chat panel.
 */
"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { listConversations } from "@/lib/chat/chat-storage";
import { useBalance } from "@/lib/hooks/use-balance";

export default function ChatPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = status === "authenticated";
  const { balance } = useBalance(isAuthenticated);

  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");

  const [activeConvId, setActiveConvId] = useState<string | null>(urlId);
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
      setSidebarKey((k) => k + 1);
    }
  }, [activeConvId]);

  if (status === "loading") {
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

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Compact header */}
      <nav className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded p-1 text-zinc-500 transition-colors hover:text-zinc-300 md:hidden"
            aria-label="Toggle sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" className="text-lg font-bold tracking-tight">
            OpenClaw<span className="text-orange-500">.jobs</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {balance && (
            <Link
              href="/dashboard"
              className="rounded-full border border-zinc-700 px-3 py-1 text-sm text-orange-500 transition-colors hover:border-orange-500"
              title={`$${(balance.amount_cents / 100).toFixed(2)} USD`}
            >
              {balance.amount_cents}🦐
            </Link>
          )}
          <Link
            href="/dashboard"
            className="text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Main area: sidebar + chat */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar: hidden on mobile unless toggled */}
        <div className={`${sidebarOpen ? "block" : "hidden"} md:block`}>
          <ChatSidebar
            key={sidebarKey}
            conversations={conversations}
            activeId={activeConvId}
            onSelect={handleSelectConversation}
            onNewChat={() => { handleNewChat(); setSidebarOpen(false); }}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <ChatPanel
            conversationId={activeConvId}
            onConversationChange={handleConversationChange}
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

"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { DepositModal } from "@/components/dashboard/deposit-modal";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { useBalance } from "@/lib/hooks/use-balance";
import { listConversations } from "@/lib/chat/chat-storage";

const MAX_RECENT_TASKS = 5;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = status === "authenticated";
  const { balance, refresh } = useBalance(isAuthenticated);
  const [depositOpen, setDepositOpen] = useState(false);

  const conversations = userId ? listConversations(userId) : [];
  const recentConversations = conversations.slice(0, MAX_RECENT_TASKS);

  function handleConversationSelect(id: string) {
    window.location.href = `/chat?id=${encodeURIComponent(id)}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-content-secondary">
        Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
      </p>

      {/* Balance summary */}
      <div className="mt-6 rounded-xl border border-edge bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-content-secondary">Available Balance</p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-content">
                {balance?.amount_cents ?? "—"}
              </span>
              <span className="text-base">🦐</span>
            </div>
            {balance && (
              <p className="mt-0.5 text-xs text-content-tertiary">
                = ${(balance.amount_cents / 100).toFixed(2)} USD
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDepositOpen(true)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent transition-colors hover:bg-accent-hover"
            >
              Add Funds
            </button>
            <Link
              href="/dashboard/billing"
              className="rounded-lg border border-edge px-4 py-2 text-sm text-content-secondary transition-colors hover:border-edge-strong hover:text-content"
            >
              Details
            </Link>
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-content-secondary">Recent Tasks</h2>
          {conversations.length > MAX_RECENT_TASKS && (
            <Link
              href="/dashboard/tasks"
              className="text-xs text-content-tertiary transition-colors hover:text-content-secondary"
            >
              View all ({conversations.length})
            </Link>
          )}
        </div>
        <ConversationList
          conversations={recentConversations}
          onSelect={handleConversationSelect}
        />
      </div>

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        onSuccess={() => {
          setDepositOpen(false);
          void refresh();
        }}
      />
    </div>
  );
}

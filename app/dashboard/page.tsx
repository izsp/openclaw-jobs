"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { DepositModal } from "@/components/dashboard/deposit-modal";
import { ConversationList } from "@/components/dashboard/conversation-list";
import { useBalance } from "@/lib/hooks/use-balance";
import { listConversations } from "@/lib/chat/chat-storage";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const isAuthenticated = status === "authenticated";

  const { balance, refresh } = useBalance(isAuthenticated);
  const [depositOpen, setDepositOpen] = useState(false);

  if (status === "loading") {
    return <PageShell><LoadingState /></PageShell>;
  }
  if (!isAuthenticated) {
    redirect("/login");
  }

  const conversations = userId ? listConversations(userId) : [];

  function handleConversationSelect(id: string) {
    // Navigate back to home with the conversation loaded.
    // WHY: Chat panel lives on the landing page, so we pass the ID as a query param.
    window.location.href = `/?chat=${encodeURIComponent(id)}`;
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your balance and view task history
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            {balance ? (
              <BalanceCard balance={balance} onDeposit={() => setDepositOpen(true)} />
            ) : (
              <BalanceCardSkeleton />
            )}
          </div>
          <div>
            <ConversationList
              conversations={conversations}
              onSelect={handleConversationSelect}
            />
          </div>
        </div>
      </main>

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        onSuccess={() => { setDepositOpen(false); void refresh(); }}
      />
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <Header />
      <main className="flex flex-1 items-center justify-center">{children}</main>
    </div>
  );
}

function LoadingState() {
  return <div className="text-sm text-zinc-600 animate-pulse">Loading...</div>;
}

function BalanceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="h-4 w-24 rounded bg-zinc-800" />
      <div className="mt-3 h-8 w-20 rounded bg-zinc-800" />
      <div className="mt-4 h-10 w-full rounded bg-zinc-800" />
    </div>
  );
}

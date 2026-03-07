"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { DepositModal } from "@/components/dashboard/deposit-modal";
import { useBalance } from "@/lib/hooks/use-balance";

export default function BillingPage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { balance, refresh } = useBalance(isAuthenticated);
  const [depositOpen, setDepositOpen] = useState(false);
  const searchParams = useSearchParams();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("deposit") === "success") {
      setToast("Deposit successful! Your balance has been updated.");
      void refresh();
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, refresh]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Manage your balance and add funds
      </p>

      {toast && (
        <div className="mt-4 rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-400">
          {toast}
        </div>
      )}

      <div className="mt-6 max-w-md">
        {balance ? (
          <BalanceCard
            balance={balance}
            onDeposit={() => setDepositOpen(true)}
          />
        ) : (
          <BalanceCardSkeleton />
        )}
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

function BalanceCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="h-4 w-24 rounded bg-zinc-800" />
      <div className="mt-3 h-8 w-20 rounded bg-zinc-800" />
      <div className="mt-4 h-10 w-full rounded bg-zinc-800" />
    </div>
  );
}

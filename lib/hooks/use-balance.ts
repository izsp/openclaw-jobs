/**
 * React hook for fetching and caching the user's balance.
 * Auto-refreshes on mount and exposes a manual refresh.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { getBalance, type BalanceData } from "@/lib/api/balance-client";

interface UseBalanceReturn {
  balance: BalanceData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBalance(enabled = true): UseBalanceReturn {
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBalance();
      setBalance(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      void refresh();
    }
  }, [enabled, refresh]);

  return { balance, loading, error, refresh };
}

"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getAdminToken,
  setAdminToken,
  clearAdminToken,
} from "@/lib/api/admin/admin-fetch";

/** Hook for admin authentication state and actions. */
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!getAdminToken());
  }, []);

  const login = useCallback(async (secret: string) => {
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) throw new Error("Invalid admin secret");
    setAdminToken(secret);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}

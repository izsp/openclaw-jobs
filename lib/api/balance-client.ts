/**
 * Frontend API client for balance operations.
 */
import { fetchApi } from "./fetch-api";

export interface BalanceData {
  amount_cents: number;
  frozen_cents: number;
  total_deposited: number;
  total_earned: number;
  total_withdrawn: number;
}

/** Fetches the current user's balance. */
export async function getBalance(): Promise<BalanceData> {
  return fetchApi<BalanceData>("/api/balance");
}

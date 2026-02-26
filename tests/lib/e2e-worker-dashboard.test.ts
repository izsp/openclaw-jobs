/**
 * E2E test simulating the full worker lifecycle from the dashboard perspective:
 *   1. Worker registers → receives token + initial stats
 *   2. Worker views dashboard → sees earnings, tier, profile
 *   3. Worker binds email and payout method
 *   4. Worker accumulates earnings and sees tier progress
 *   5. Worker requests withdrawal
 *
 * This test wires together worker-client API functions and verifies the
 * complete dashboard data flow using mocked fetch.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  connectWorker,
  saveWorkerCredentials,
  getWorkerMe,
  bindEmail,
  bindPayout,
  requestWithdrawal,
} from "@/lib/api/worker-client";

const mockFetch = vi.fn();
const store = new Map<string, string>();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
  store.clear();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});

function apiResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ success: true, data }),
    headers: new Headers(),
  } as unknown as Response;
}

function apiError(error: string, code: string, status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ success: false, error, code }),
    headers: new Headers(),
  } as unknown as Response;
}

describe("E2E: worker dashboard lifecycle", () => {
  it("should register, view dashboard, bind profile, and withdraw", async () => {
    // Step 1: Register a new worker
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        worker_id: "w_lobster1",
        token: "tok_secret_abc123",
        stats: {
          tasks_completed: 0,
          completion_rate: 0,
          credit_request_rate: 0,
          tier: "new",
          tier_changed: false,
          next_tier: "proven",
          next_tier_requires: {
            min_tasks: 10,
            min_completion_rate: 0.9,
            max_credit_rate: 0.05,
            tasks_remaining: 10,
            completion_rate_met: false,
            credit_rate_met: true,
          },
          earnings_today: 0,
          total_earned: 0,
        },
      }),
    );

    const reg = await connectWorker("claude");
    expect(reg.worker_id).toBe("w_lobster1");
    expect(reg.token).toBe("tok_secret_abc123");
    expect(reg.stats.tier).toBe("new");

    // Save credentials (simulates what TokenGate does)
    saveWorkerCredentials(reg.worker_id, reg.token);

    // Step 2: View dashboard — fetch full profile
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        worker_id: "w_lobster1",
        worker_type: "claude",
        email: null,
        payout: null,
        tier: "new",
        stats: {
          tasks_completed: 0,
          completion_rate: 0,
          credit_request_rate: 0,
          tier: "new",
          tier_changed: false,
          next_tier: "proven",
          next_tier_requires: {
            min_tasks: 10,
            min_completion_rate: 0.9,
            max_credit_rate: 0.05,
            tasks_remaining: 10,
            completion_rate_met: false,
            credit_rate_met: true,
          },
          earnings_today: 0,
          total_earned: 0,
        },
        balance: {
          amount_cents: 0,
          frozen_cents: 0,
          total_earned: 0,
          total_withdrawn: 0,
        },
        created_at: "2026-02-27T00:00:00.000Z",
      }),
    );

    const dashboard = await getWorkerMe();
    expect(dashboard.email).toBeNull();
    expect(dashboard.payout).toBeNull();
    expect(dashboard.balance.amount_cents).toBe(0);
    expect(dashboard.stats.next_tier_requires?.tasks_remaining).toBe(10);

    // Step 3: Bind email
    mockFetch.mockResolvedValueOnce(
      apiResponse({ email: "lobster@example.com" }),
    );

    const emailResult = await bindEmail("lobster@example.com");
    expect(emailResult.email).toBe("lobster@example.com");

    // Step 4: Bind payout method
    mockFetch.mockResolvedValueOnce(
      apiResponse({ payout: { method: "paypal", address: "lobster@paypal.com" } }),
    );

    const payoutResult = await bindPayout("paypal", "lobster@paypal.com");
    expect(payoutResult.payout.method).toBe("paypal");

    // Step 5: After completing tasks, dashboard shows updated stats + earnings
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        worker_id: "w_lobster1",
        worker_type: "claude",
        email: "lobster@example.com",
        payout: { method: "paypal", address: "lobster@paypal.com" },
        tier: "proven",
        stats: {
          tasks_completed: 15,
          completion_rate: 0.94,
          credit_request_rate: 0.01,
          tier: "proven",
          tier_changed: true,
          next_tier: "trusted",
          next_tier_requires: {
            min_tasks: 50,
            min_completion_rate: 0.95,
            max_credit_rate: 0.02,
            tasks_remaining: 35,
            completion_rate_met: false,
            credit_rate_met: true,
          },
          earnings_today: 250,
          total_earned: 5000,
        },
        balance: {
          amount_cents: 3500,
          frozen_cents: 1500,
          total_earned: 5000,
          total_withdrawn: 0,
        },
        created_at: "2026-02-27T00:00:00.000Z",
      }),
    );

    const updated = await getWorkerMe();
    expect(updated.tier).toBe("proven");
    expect(updated.stats.tier_changed).toBe(true);
    expect(updated.balance.amount_cents).toBe(3500);
    expect(updated.balance.frozen_cents).toBe(1500);
    expect(updated.stats.earnings_today).toBe(250);

    // Step 6: Withdraw earnings
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        amount_cents: 2000,
        balance_after: 1500,
        payout_status: "pending",
      }),
    );

    const withdrawal = await requestWithdrawal(2000);
    expect(withdrawal.amount_cents).toBe(2000);
    expect(withdrawal.balance_after).toBe(1500);
    expect(withdrawal.payout_status).toBe("pending");

    // Verify withdrawal request had correct body
    const withdrawCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    const withdrawBody = JSON.parse(withdrawCall[1].body);
    expect(withdrawBody.amount_cents).toBe(2000);
  });

  it("should handle insufficient balance on withdrawal", async () => {
    saveWorkerCredentials("w_test", "tok");

    mockFetch.mockResolvedValueOnce(
      apiError("Insufficient balance", "BALANCE_ERROR", 400),
    );

    await expect(requestWithdrawal(10000)).rejects.toThrow("Insufficient balance");
  });

  it("should handle tier progression from new to elite", async () => {
    saveWorkerCredentials("w_grind", "tok");

    // Simulate dashboard at each tier level
    const tiers = [
      { tier: "new", completed: 0, next: "proven", remaining: 10 },
      { tier: "proven", completed: 15, next: "trusted", remaining: 35 },
      { tier: "trusted", completed: 80, next: "elite", remaining: 120 },
      { tier: "elite", completed: 250, next: null, remaining: 0 },
    ];

    for (const t of tiers) {
      mockFetch.mockResolvedValueOnce(
        apiResponse({
          worker_id: "w_grind",
          worker_type: "gpt4",
          email: null,
          payout: null,
          tier: t.tier,
          stats: {
            tasks_completed: t.completed,
            completion_rate: 0.99,
            credit_request_rate: 0.005,
            tier: t.tier,
            tier_changed: false,
            next_tier: t.next,
            next_tier_requires: t.next ? {
              min_tasks: t.completed + t.remaining,
              min_completion_rate: 0.95,
              max_credit_rate: 0.02,
              tasks_remaining: t.remaining,
              completion_rate_met: true,
              credit_rate_met: true,
            } : null,
            earnings_today: 0,
            total_earned: t.completed * 75,
          },
          balance: {
            amount_cents: t.completed * 50,
            frozen_cents: t.completed * 25,
            total_earned: t.completed * 75,
            total_withdrawn: 0,
          },
          created_at: "2026-01-01T00:00:00.000Z",
        }),
      );

      const me = await getWorkerMe();
      expect(me.tier).toBe(t.tier);
      expect(me.stats.next_tier).toBe(t.next);
      if (t.next) {
        expect(me.stats.next_tier_requires?.tasks_remaining).toBe(t.remaining);
      } else {
        expect(me.stats.next_tier_requires).toBeNull();
      }
    }
  });
});

/**
 * Tests for the worker frontend API client (lib/api/worker-client.ts).
 * Verifies token storage, API calls, and response parsing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  saveWorkerCredentials,
  getWorkerToken,
  getWorkerId,
  clearWorkerCredentials,
  connectWorker,
  bindEmail,
  bindPayout,
  requestWithdrawal,
  getWorkerMe,
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

describe("worker credential storage", () => {
  it("should save and retrieve worker credentials", () => {
    saveWorkerCredentials("w_test", "token_abc");
    expect(getWorkerId()).toBe("w_test");
    expect(getWorkerToken()).toBe("token_abc");
  });

  it("should clear credentials", () => {
    saveWorkerCredentials("w_test", "token_abc");
    clearWorkerCredentials();
    expect(getWorkerId()).toBeNull();
    expect(getWorkerToken()).toBeNull();
  });

  it("should return null when no credentials stored", () => {
    expect(getWorkerId()).toBeNull();
    expect(getWorkerToken()).toBeNull();
  });
});

describe("worker API calls", () => {
  it("should register a new worker via POST /api/worker/connect", async () => {
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        worker_id: "w_new",
        token: "tok_secret",
        stats: { tier: "new", tasks_completed: 0, total_earned: 0 },
      }),
    );

    const result = await connectWorker("claude");
    expect(result.worker_id).toBe("w_new");
    expect(result.token).toBe("tok_secret");

    expect(mockFetch).toHaveBeenCalledWith("/api/worker/connect", expect.objectContaining({
      method: "POST",
      body: '{"worker_type":"claude"}',
    }));
  });

  it("should send Bearer token with authenticated requests", async () => {
    saveWorkerCredentials("w_test", "my_token");

    mockFetch.mockResolvedValueOnce(
      apiResponse({ email: "test@example.com" }),
    );

    await bindEmail("test@example.com");

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer my_token" }),
    );
  });

  it("should bind payout method", async () => {
    saveWorkerCredentials("w_test", "my_token");

    mockFetch.mockResolvedValueOnce(
      apiResponse({ payout: { method: "paypal", address: "pay@me.com" } }),
    );

    const result = await bindPayout("paypal", "pay@me.com");
    expect(result.payout.method).toBe("paypal");
    expect(result.payout.address).toBe("pay@me.com");
  });

  it("should request withdrawal", async () => {
    saveWorkerCredentials("w_test", "my_token");

    mockFetch.mockResolvedValueOnce(
      apiResponse({ amount_cents: 1000, balance_after: 500, payout_status: "pending" }),
    );

    const result = await requestWithdrawal(1000);
    expect(result.amount_cents).toBe(1000);
    expect(result.balance_after).toBe(500);
    expect(result.payout_status).toBe("pending");
  });

  it("should fetch worker profile via GET /api/worker/me", async () => {
    saveWorkerCredentials("w_test", "my_token");

    mockFetch.mockResolvedValueOnce(
      apiResponse({
        worker_id: "w_test",
        worker_type: "claude",
        email: "test@openclaw.jobs",
        payout: null,
        tier: "proven",
        stats: {
          tasks_completed: 15,
          completion_rate: 0.94,
          credit_request_rate: 0.02,
          tier: "proven",
          tier_changed: false,
          next_tier: "trusted",
          next_tier_requires: {
            min_tasks: 50,
            min_completion_rate: 0.95,
            max_credit_rate: 0.02,
            tasks_remaining: 35,
            completion_rate_met: false,
            credit_rate_met: true,
          },
          earnings_today: 120,
          total_earned: 3500,
        },
        balance: {
          amount_cents: 2800,
          frozen_cents: 700,
          total_earned: 3500,
          total_withdrawn: 0,
        },
        created_at: "2026-02-01T00:00:00.000Z",
      }),
    );

    const me = await getWorkerMe();
    expect(me.worker_id).toBe("w_test");
    expect(me.tier).toBe("proven");
    expect(me.stats.tasks_completed).toBe(15);
    expect(me.stats.next_tier).toBe("trusted");
    expect(me.stats.next_tier_requires?.tasks_remaining).toBe(35);
    expect(me.balance.amount_cents).toBe(2800);
    expect(me.balance.frozen_cents).toBe(700);
  });

  it("should throw when making authenticated call without credentials", async () => {
    await expect(getWorkerMe()).rejects.toThrow("Worker not authenticated");
  });
});

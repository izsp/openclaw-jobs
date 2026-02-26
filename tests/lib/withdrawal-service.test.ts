/**
 * Tests for withdrawal service.
 * Verifies balance checks, minimum/daily limits, and transaction recording.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBalances, mockTransactions } = vi.hoisted(() => ({
  mockBalances: new Map<string, Record<string, unknown>>(),
  mockTransactions: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockImplementation(async () => ({
    collection: (name: string) => {
      const store = name === "balance" ? mockBalances : null;

      return {
        insertOne: vi.fn().mockImplementation((doc: Record<string, unknown>) => {
          if (name === "transaction") {
            mockTransactions.push(doc);
            return { insertedId: doc._id };
          }
          if (store) store.set(doc._id as string, { ...doc });
          return { insertedId: doc._id };
        }),
        findOneAndUpdate: vi.fn().mockImplementation(
          (filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>) => {
            if (!store) return null;
            const doc = store.get(filter._id as string);
            if (!doc) return null;
            // Check conditional $gte
            for (const [key, val] of Object.entries(filter)) {
              if (key === "_id") continue;
              if (typeof val === "object" && val !== null) {
                const ops = val as Record<string, unknown>;
                if ("$gte" in ops && (doc[key] as number) < (ops.$gte as number)) return null;
              }
            }
            if (update.$inc) {
              for (const [key, val] of Object.entries(update.$inc as Record<string, number>)) {
                doc[key] = ((doc[key] as number) || 0) + val;
              }
            }
            return options?.returnDocument === "after" ? { ...doc } : { ...doc };
          },
        ),
        find: vi.fn().mockImplementation((filter: Record<string, unknown>) => ({
          toArray: vi.fn().mockImplementation(async () => {
            // Return matching transactions for daily limit check
            if (name !== "transaction") return [];
            return mockTransactions.filter((tx) => {
              if (filter.user_id && tx.user_id !== filter.user_id) return false;
              if (filter.type && tx.type !== filter.type) return false;
              if (filter.created_at && typeof filter.created_at === "object") {
                const ops = filter.created_at as Record<string, unknown>;
                if ("$gte" in ops) {
                  const txDate = (tx.created_at as Date).getTime();
                  const filterDate = (ops.$gte as Date).getTime();
                  if (txDate < filterDate) return false;
                }
              }
              return true;
            });
          }),
        })),
      };
    },
  })),
}));

vi.mock("@/lib/config", () => ({
  getConfig: vi.fn().mockImplementation((key: string) => {
    if (key === "commissions") {
      return {
        freeze_window_hours: 24,
        min_withdrawal_cents: 500,
        daily_withdrawal_limit_cents: 5000,
      };
    }
    return null;
  }),
}));

import { requestWithdrawal } from "@/lib/services/withdrawal-service";

beforeEach(() => {
  mockBalances.clear();
  mockTransactions.length = 0;
  vi.clearAllMocks();
});

describe("requestWithdrawal", () => {
  it("should deduct from available balance and record transaction", async () => {
    mockBalances.set("w_1", {
      _id: "w_1",
      amount_cents: 1000,
      frozen_cents: 200,
      total_withdrawn: 0,
    });

    const result = await requestWithdrawal("w_1", 500);

    expect(result.amount_cents).toBe(500);
    expect(result.balance_after).toBe(500);
    expect(result.payout_status).toBe("pending");

    const balance = mockBalances.get("w_1")!;
    expect(balance.amount_cents).toBe(500);
    expect(balance.total_withdrawn).toBe(500);
  });

  it("should reject withdrawal below minimum", async () => {
    mockBalances.set("w_2", {
      _id: "w_2",
      amount_cents: 1000,
      frozen_cents: 0,
      total_withdrawn: 0,
    });

    await expect(requestWithdrawal("w_2", 100)).rejects.toThrow("Minimum withdrawal");
  });

  it("should reject withdrawal exceeding available balance", async () => {
    mockBalances.set("w_3", {
      _id: "w_3",
      amount_cents: 300,
      frozen_cents: 500,
      total_withdrawn: 0,
    });

    await expect(requestWithdrawal("w_3", 500)).rejects.toThrow("Insufficient");
  });

  it("should reject withdrawal exceeding daily limit", async () => {
    mockBalances.set("w_4", {
      _id: "w_4",
      amount_cents: 10000,
      frozen_cents: 0,
      total_withdrawn: 0,
    });

    // Simulate existing withdrawal today
    mockTransactions.push({
      _id: "tx_today",
      user_id: "w_4",
      type: "withdraw",
      amount_cents: -4000,
      created_at: new Date(),
    });

    await expect(requestWithdrawal("w_4", 2000)).rejects.toThrow("Daily withdrawal limit");
  });

  it("should record a withdraw transaction", async () => {
    mockBalances.set("w_5", {
      _id: "w_5",
      amount_cents: 2000,
      frozen_cents: 0,
      total_withdrawn: 0,
    });

    await requestWithdrawal("w_5", 500);

    const withdrawTx = mockTransactions.find(
      (tx) => tx.type === "withdraw" && tx.user_id === "w_5",
    );
    expect(withdrawTx).toBeDefined();
    expect(withdrawTx!.amount_cents).toBe(-500);
  });
});

/**
 * Tests for freeze/unfreeze earnings flow.
 * Verifies earnings go to frozen_cents and mature into available balance.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state ──────────────────────────────────────────────────────────────
const { mockBalances, mockFrozenEarnings, mockTransactions } = vi.hoisted(() => ({
  mockBalances: new Map<string, Record<string, unknown>>(),
  mockFrozenEarnings: new Map<string, Record<string, unknown>>(),
  mockTransactions: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockImplementation(async () => ({
    collection: (name: string) => {
      const store =
        name === "balance" ? mockBalances
          : name === "frozen_earning" ? mockFrozenEarnings
            : null;

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
            // Check conditional queries (e.g. frozen_cents: { $gte: N })
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
            if (update.$set) Object.assign(doc, update.$set as object);
            return options?.returnDocument === "after" ? { ...doc } : { ...doc };
          },
        ),
        find: vi.fn().mockImplementation((filter: Record<string, unknown>) => ({
          toArray: vi.fn().mockImplementation(async () => {
            if (!store) return [];
            return [...store.values()]
              .filter((doc) => {
                for (const [key, val] of Object.entries(filter)) {
                  if (typeof val === "object" && val !== null) {
                    const ops = val as Record<string, unknown>;
                    if ("$lte" in ops) {
                      const docDate = doc[key] instanceof Date ? (doc[key] as Date).getTime() : (doc[key] as number);
                      const filterDate = ops.$lte instanceof Date ? (ops.$lte as Date).getTime() : (ops.$lte as number);
                      if (docDate > filterDate) return false;
                    }
                  } else if (doc[key] !== val) {
                    return false;
                  }
                }
                return true;
              })
              .map((doc) => ({ ...doc }));
          }),
        })),
        deleteMany: vi.fn().mockImplementation((filter: Record<string, unknown>) => {
          if (!store) return { deletedCount: 0 };
          const ids = (filter._id as Record<string, unknown>)?.$in as string[] ?? [];
          let count = 0;
          for (const id of ids) {
            if (store.delete(id)) count++;
          }
          return { deletedCount: count };
        }),
      };
    },
  })),
}));

import { freezeEarning } from "@/lib/services/balance-service";
import { unfreezeMaturedEarnings } from "@/lib/services/unfreeze-service";

beforeEach(() => {
  mockBalances.clear();
  mockFrozenEarnings.clear();
  mockTransactions.length = 0;
  vi.clearAllMocks();
});

describe("freezeEarning", () => {
  it("should add to frozen_cents and total_earned, not amount_cents", async () => {
    mockBalances.set("w_1", {
      _id: "w_1",
      amount_cents: 0,
      frozen_cents: 0,
      total_earned: 0,
    });

    const maturity = new Date(Date.now() + 86400000);
    await freezeEarning("w_1", 75, "task_1", maturity);

    const balance = mockBalances.get("w_1")!;
    expect(balance.frozen_cents).toBe(75);
    expect(balance.total_earned).toBe(75);
    expect(balance.amount_cents).toBe(0);
  });

  it("should create a frozen_earning record", async () => {
    mockBalances.set("w_2", {
      _id: "w_2",
      amount_cents: 0,
      frozen_cents: 0,
      total_earned: 0,
    });

    const maturity = new Date(Date.now() + 86400000);
    await freezeEarning("w_2", 50, "task_2", maturity);

    expect(mockFrozenEarnings.size).toBe(1);
    const earning = [...mockFrozenEarnings.values()][0]!;
    expect(earning.worker_id).toBe("w_2");
    expect(earning.task_id).toBe("task_2");
    expect(earning.amount_cents).toBe(50);
    expect(earning.maturity_at).toEqual(maturity);
  });

  it("should record a freeze transaction", async () => {
    mockBalances.set("w_3", {
      _id: "w_3",
      amount_cents: 0,
      frozen_cents: 0,
      total_earned: 0,
    });

    await freezeEarning("w_3", 100, "task_3", new Date(Date.now() + 86400000));

    const freezeTx = mockTransactions.find((tx) => tx.type === "freeze");
    expect(freezeTx).toBeDefined();
    expect(freezeTx!.user_id).toBe("w_3");
    expect(freezeTx!.amount_cents).toBe(100);
  });
});

describe("unfreezeMaturedEarnings", () => {
  it("should move matured earnings from frozen to available", async () => {
    mockBalances.set("w_1", {
      _id: "w_1",
      amount_cents: 0,
      frozen_cents: 200,
      total_earned: 200,
    });

    // Two matured earnings
    mockFrozenEarnings.set("fe_1", {
      _id: "fe_1",
      worker_id: "w_1",
      task_id: "task_a",
      amount_cents: 120,
      frozen_at: new Date(Date.now() - 86400000),
      maturity_at: new Date(Date.now() - 3600000), // matured 1h ago
    });
    mockFrozenEarnings.set("fe_2", {
      _id: "fe_2",
      worker_id: "w_1",
      task_id: "task_b",
      amount_cents: 80,
      frozen_at: new Date(Date.now() - 86400000),
      maturity_at: new Date(Date.now() - 1800000), // matured 30min ago
    });

    const result = await unfreezeMaturedEarnings();

    expect(result.workersProcessed).toBe(1);
    expect(result.totalUnfrozen).toBe(200);

    const balance = mockBalances.get("w_1")!;
    expect(balance.amount_cents).toBe(200);
    expect(balance.frozen_cents).toBe(0);
  });

  it("should delete processed frozen_earning records", async () => {
    mockBalances.set("w_1", {
      _id: "w_1",
      amount_cents: 0,
      frozen_cents: 50,
      total_earned: 50,
    });
    mockFrozenEarnings.set("fe_del", {
      _id: "fe_del",
      worker_id: "w_1",
      task_id: "task_del",
      amount_cents: 50,
      frozen_at: new Date(Date.now() - 86400000),
      maturity_at: new Date(Date.now() - 1000),
    });

    await unfreezeMaturedEarnings();

    expect(mockFrozenEarnings.size).toBe(0);
  });

  it("should record an unfreeze transaction", async () => {
    mockBalances.set("w_1", {
      _id: "w_1",
      amount_cents: 0,
      frozen_cents: 100,
      total_earned: 100,
    });
    mockFrozenEarnings.set("fe_tx", {
      _id: "fe_tx",
      worker_id: "w_1",
      task_id: "task_tx",
      amount_cents: 100,
      frozen_at: new Date(Date.now() - 86400000),
      maturity_at: new Date(Date.now() - 1000),
    });

    await unfreezeMaturedEarnings();

    const unfreezeTx = mockTransactions.find((tx) => tx.type === "unfreeze");
    expect(unfreezeTx).toBeDefined();
    expect(unfreezeTx!.user_id).toBe("w_1");
    expect(unfreezeTx!.amount_cents).toBe(100);
  });

  it("should not unfreeze earnings before maturity", async () => {
    mockBalances.set("w_1", {
      _id: "w_1",
      amount_cents: 0,
      frozen_cents: 100,
      total_earned: 100,
    });
    mockFrozenEarnings.set("fe_future", {
      _id: "fe_future",
      worker_id: "w_1",
      task_id: "task_future",
      amount_cents: 100,
      frozen_at: new Date(),
      maturity_at: new Date(Date.now() + 86400000), // matures tomorrow
    });

    const result = await unfreezeMaturedEarnings();

    expect(result.workersProcessed).toBe(0);
    expect(result.totalUnfrozen).toBe(0);
    expect(mockFrozenEarnings.size).toBe(1);
  });

  it("should handle multiple workers with matured earnings", async () => {
    mockBalances.set("w_a", { _id: "w_a", amount_cents: 0, frozen_cents: 50, total_earned: 50 });
    mockBalances.set("w_b", { _id: "w_b", amount_cents: 0, frozen_cents: 75, total_earned: 75 });

    mockFrozenEarnings.set("fe_a", {
      _id: "fe_a", worker_id: "w_a", task_id: "t_a",
      amount_cents: 50, frozen_at: new Date(Date.now() - 86400000),
      maturity_at: new Date(Date.now() - 1000),
    });
    mockFrozenEarnings.set("fe_b", {
      _id: "fe_b", worker_id: "w_b", task_id: "t_b",
      amount_cents: 75, frozen_at: new Date(Date.now() - 86400000),
      maturity_at: new Date(Date.now() - 1000),
    });

    const result = await unfreezeMaturedEarnings();

    expect(result.workersProcessed).toBe(2);
    expect(result.totalUnfrozen).toBe(125);
    expect(mockBalances.get("w_a")!.amount_cents).toBe(50);
    expect(mockBalances.get("w_b")!.amount_cents).toBe(75);
  });

  it("should return zero when no earnings are matured", async () => {
    const result = await unfreezeMaturedEarnings();
    expect(result.workersProcessed).toBe(0);
    expect(result.totalUnfrozen).toBe(0);
  });
});

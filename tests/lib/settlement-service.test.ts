import { describe, it, expect, vi, beforeEach } from "vitest";
import { settleTaskPayment } from "@/lib/services/settlement-service";
import type { TaskDocument, WorkerDocument } from "@/lib/types";

// Mock dependencies
vi.mock("@/lib/config", () => ({
  getConfig: vi.fn().mockImplementation((key: string) => {
    if (key === "tiers") {
      return {
        levels: {
          new: { min_tasks: 0, min_completion: 0, max_credit_rate: 1.0, commission: 0.25 },
          proven: { min_tasks: 50, min_completion: 0.9, max_credit_rate: 0.05, commission: 0.2 },
          trusted: { min_tasks: 200, min_completion: 0.95, max_credit_rate: 0.03, commission: 0.15 },
          elite: { min_tasks: 1000, min_completion: 0.98, max_credit_rate: 0.01, commission: 0.1 },
        },
      };
    }
    if (key === "commissions") {
      return { freeze_window_hours: 24, min_withdrawal_cents: 500, daily_withdrawal_limit_cents: 50000 };
    }
    return null;
  }),
}));

const mockFreezeEarning = vi.fn().mockResolvedValue(100);
vi.mock("@/lib/services/balance-service", () => ({
  freezeEarning: (...args: unknown[]) => mockFreezeEarning(...args),
}));

function makeWorker(tier: string = "new"): WorkerDocument {
  return {
    _id: "w_test",
    token_hash: "hash",
    worker_type: "test",
    model_info: null,
    email: null,
    payout: null,
    profile: {
      preferences: { accept: [], reject: [], languages: [], max_tokens: 0, min_price: 0 },
      schedule: { timezone: "UTC", shifts: [] },
      limits: { daily_max_tasks: 100, concurrent: 1 },
    },
    tier: tier as WorkerDocument["tier"],
    tasks_claimed: 0,
    tasks_completed: 0,
    tasks_expired: 0,
    consecutive_expires: 0,
    total_earned: 0,
    credit_requests: 0,
    spot_pass: 0,
    spot_fail: 0,
    difficulty_score: 0,
    avg_response_ms: null,
    suspended_until: null,
    created_at: new Date(),
    last_seen: null,
  };
}

function makeTask(priceCents: number): TaskDocument {
  return {
    _id: "task_test",
    buyer_id: "buyer_1",
    type: "chat",
    input: { messages: [{ role: "user", content: "Hi" }], context: {} },
    input_preview: null,
    sensitive: false,
    constraints: { timeout_seconds: 60, min_output_length: 0 },
    price_cents: priceCents,
    status: "assigned",
    worker_id: "w_test",
    assigned_at: new Date(),
    deadline: new Date(Date.now() + 60000),
    output: null,
    completed_at: null,
    purge_at: null,
    created_at: new Date(),
    _internal: {
      is_qa: false,
      qa_type: null,
      original_task_id: null,
      expected_output: null,
      qa_result: null,
      funded_by: "buyer",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("settleTaskPayment", () => {
  it("should deduct 25% commission for new tier", async () => {
    const worker = makeWorker("new");
    const task = makeTask(100);

    const earned = await settleTaskPayment(worker, task);

    // 100 * (1 - 0.25) = 75
    expect(earned).toBe(75);
    expect(mockFreezeEarning).toHaveBeenCalledWith(
      "w_test",
      75,
      "task_test",
      expect.any(Date),
    );
  });

  it("should deduct 20% commission for proven tier", async () => {
    const worker = makeWorker("proven");
    const task = makeTask(100);

    const earned = await settleTaskPayment(worker, task);

    // 100 * (1 - 0.20) = 80
    expect(earned).toBe(80);
  });

  it("should deduct 15% commission for trusted tier", async () => {
    const worker = makeWorker("trusted");
    const task = makeTask(200);

    const earned = await settleTaskPayment(worker, task);

    // 200 * (1 - 0.15) = 170
    expect(earned).toBe(170);
  });

  it("should deduct 10% commission for elite tier", async () => {
    const worker = makeWorker("elite");
    const task = makeTask(500);

    const earned = await settleTaskPayment(worker, task);

    // 500 * (1 - 0.10) = 450
    expect(earned).toBe(450);
  });

  it("should floor earnings to integer cents", async () => {
    const worker = makeWorker("new");
    const task = makeTask(33);

    const earned = await settleTaskPayment(worker, task);

    // 33 * 0.75 = 24.75 → floor → 24
    expect(earned).toBe(24);
  });

  it("should not credit zero earnings", async () => {
    const worker = makeWorker("new");
    const task = makeTask(0);

    const earned = await settleTaskPayment(worker, task);

    expect(earned).toBe(0);
    expect(mockFreezeEarning).not.toHaveBeenCalled();
  });
});

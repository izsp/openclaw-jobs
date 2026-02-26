import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildWorkerStats } from "@/lib/services/worker-stats";
import type { WorkerDocument } from "@/lib/types";

// Mock config
vi.mock("@/lib/config", () => ({
  getConfig: vi.fn().mockResolvedValue({
    _id: "tiers",
    levels: {
      new: { min_tasks: 0, min_completion: 0, max_credit_rate: 1.0, commission: 0.25 },
      proven: { min_tasks: 50, min_completion: 0.9, max_credit_rate: 0.05, commission: 0.2 },
      trusted: { min_tasks: 200, min_completion: 0.95, max_credit_rate: 0.03, commission: 0.15 },
      elite: { min_tasks: 1000, min_completion: 0.98, max_credit_rate: 0.01, commission: 0.1 },
    },
  }),
}));

function makeWorker(overrides: Partial<WorkerDocument> = {}): WorkerDocument {
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
    tier: "new",
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
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildWorkerStats", () => {
  it("should return correct stats for a new worker", async () => {
    const worker = makeWorker();
    const stats = await buildWorkerStats(worker, false);

    expect(stats.tier).toBe("new");
    expect(stats.tasks_completed).toBe(0);
    expect(stats.completion_rate).toBe(0);
    expect(stats.next_tier).toBe("proven");
    expect(stats.next_tier_requires).toHaveProperty("min_tasks", 50);
  });

  it("should increment tasks_completed when justCompleted is true", async () => {
    const worker = makeWorker({ tasks_completed: 10 });
    const stats = await buildWorkerStats(worker, true);

    expect(stats.tasks_completed).toBe(11);
  });

  it("should calculate completion rate correctly", async () => {
    const worker = makeWorker({ tasks_completed: 90, tasks_expired: 10 });
    const stats = await buildWorkerStats(worker, false);

    expect(stats.completion_rate).toBe(0.9);
  });

  it("should show no next tier for elite workers", async () => {
    const worker = makeWorker({ tier: "elite", tasks_completed: 1500 });
    const stats = await buildWorkerStats(worker, false);

    expect(stats.next_tier).toBeNull();
    expect(stats.next_tier_requires).toBeNull();
  });

  it("should calculate tasks_remaining toward next tier", async () => {
    const worker = makeWorker({ tier: "new", tasks_completed: 30 });
    const stats = await buildWorkerStats(worker, false);

    expect(stats.next_tier).toBe("proven");
    const requires = stats.next_tier_requires as Record<string, unknown>;
    expect(requires.tasks_remaining).toBe(20);
  });

  it("should calculate credit request rate", async () => {
    const worker = makeWorker({
      tasks_completed: 100,
      credit_requests: 5,
    });
    const stats = await buildWorkerStats(worker, false);

    expect(stats.credit_request_rate).toBe(0.05);
  });
});

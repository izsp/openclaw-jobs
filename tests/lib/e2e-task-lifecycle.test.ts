/**
 * End-to-end task lifecycle tests.
 * Covers the full flow: buyer creates task → worker claims → worker submits → settlement.
 * Uses mocked MongoDB operations to test service-level integration.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mock state ────────────────────────────────────────────────────────
const mockTasks = new Map<string, Record<string, unknown>>();
const mockWorkers = new Map<string, Record<string, unknown>>();
const mockBalances = new Map<string, Record<string, unknown>>();
const mockFrozenEarnings = new Map<string, Record<string, unknown>>();
const mockTransactions: Record<string, unknown>[] = [];

function resetState() {
  mockTasks.clear();
  mockWorkers.clear();
  mockBalances.clear();
  mockFrozenEarnings.clear();
  mockTransactions.length = 0;
}

// ── Mock MongoDB ─────────────────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: (name: string) => {
      const store =
        name === "task"
          ? mockTasks
          : name === "worker"
            ? mockWorkers
            : name === "balance"
              ? mockBalances
              : name === "frozen_earning"
                ? mockFrozenEarnings
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
        findOne: vi.fn().mockImplementation((filter: Record<string, unknown>) => {
          if (!store) return null;
          for (const doc of store.values()) {
            if (matchesFilter(doc, filter)) return { ...doc };
          }
          return null;
        }),
        findOneAndUpdate: vi.fn().mockImplementation(
          (
            filter: Record<string, unknown>,
            update: Record<string, unknown>,
            options?: Record<string, unknown>,
          ) => {
            if (!store) return null;
            for (const [key, doc] of store.entries()) {
              if (matchesFilter(doc, filter)) {
                applyUpdate(doc, update);
                store.set(key, doc);
                return options?.returnDocument === "before"
                  ? { ...doc } // simplified: returns after update for mock
                  : { ...doc };
              }
            }
            return null;
          },
        ),
        updateOne: vi.fn().mockImplementation(
          (
            filter: Record<string, unknown>,
            update: Record<string, unknown>,
            options?: Record<string, unknown>,
          ) => {
            if (!store) return { matchedCount: 0 };
            for (const [key, doc] of store.entries()) {
              if (matchesFilter(doc, filter)) {
                if (options?.upsert && !store.has(key)) {
                  const newDoc = { _id: filter._id, ...((update.$setOnInsert ?? {}) as object) };
                  store.set(filter._id as string, newDoc);
                  return { matchedCount: 0, upsertedCount: 1 };
                }
                applyUpdate(doc, update);
                store.set(key, doc);
                return { matchedCount: 1 };
              }
            }
            if (options?.upsert) {
              const newDoc = { _id: filter._id, ...((update.$setOnInsert ?? {}) as object) };
              store.set(filter._id as string, newDoc as Record<string, unknown>);
              return { matchedCount: 0, upsertedCount: 1 };
            }
            return { matchedCount: 0 };
          },
        ),
      };
    },
  }),
}));

vi.mock("@/lib/config", () => ({
  getConfig: vi.fn().mockImplementation((key: string) => {
    if (key === "pricing") {
      return {
        _id: "pricing",
        chat: { base_cents: 2 },
        code: { base_cents: 5 },
      };
    }
    if (key === "tiers") {
      return {
        _id: "tiers",
        levels: {
          new: { min_tasks: 0, min_completion: 0, max_credit_rate: 1.0, commission: 0.25 },
          proven: { min_tasks: 50, min_completion: 0.9, max_credit_rate: 0.05, commission: 0.2 },
          trusted: { min_tasks: 200, min_completion: 0.95, max_credit_rate: 0.03, commission: 0.15 },
          elite: { min_tasks: 1000, min_completion: 0.98, max_credit_rate: 0.01, commission: 0.1 },
        },
      };
    }
    if (key === "commissions") {
      return {
        freeze_window_hours: 24,
        min_withdrawal_cents: 500,
        daily_withdrawal_limit_cents: 50000,
      };
    }
    if (key === "qa") {
      return {
        _id: "qa",
        spot_check_rates: { new: 0, proven: 0, trusted: 0, elite: 0, suspicious: 0 },
        shadow_execution_rate: 0,
        similarity_thresholds: { pass: 0.8, flag: 0.6 },
        penalty: { first_fail: "warning", second_fail: { deduct_pct: 10, downgrade: true }, third_fail: { ban: true, freeze_balance: true } },
      };
    }
    return null;
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function matchesFilter(
  doc: Record<string, unknown>,
  filter: Record<string, unknown>,
): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>;
      if ("$gte" in ops && (doc[key] as number) < (ops.$gte as number)) return false;
      if ("$gt" in ops && (doc[key] as number) <= (ops.$gt as number)) return false;
      if ("$in" in ops && !(ops.$in as unknown[]).includes(doc[key])) return false;
      if ("$ne" in ops && doc[key] === ops.$ne) return false;
    } else if (doc[key] !== value) {
      return false;
    }
  }
  return true;
}

function applyUpdate(
  doc: Record<string, unknown>,
  update: Record<string, unknown>,
): void {
  if (update.$set) {
    Object.assign(doc, update.$set as object);
  }
  if (update.$inc) {
    for (const [key, val] of Object.entries(update.$inc as Record<string, number>)) {
      doc[key] = ((doc[key] as number) || 0) + val;
    }
  }
  if (update.$setOnInsert) {
    for (const [key, val] of Object.entries(update.$setOnInsert as Record<string, unknown>)) {
      if (!(key in doc)) doc[key] = val;
    }
  }
}

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { registerWorker, authenticateWorker } from "@/lib/services/worker-service";
import { claimNextTask, submitTaskResult } from "@/lib/services/dispatch-service";
import { initializeBalance, deductBalance } from "@/lib/services/balance-service";
import { hashToken } from "@/lib/hash-token";
import type { WorkerDocument } from "@/lib/types";

beforeEach(() => {
  resetState();
  vi.clearAllMocks();
});

describe("E2E: Task Lifecycle", () => {
  it("should complete full lifecycle: register → create task → claim → submit → settle", async () => {
    // 1. Initialize buyer balance
    await initializeBalance("buyer_1", 1000);
    const buyerBalance = mockBalances.get("buyer_1");
    expect(buyerBalance).toBeDefined();
    expect(buyerBalance!.amount_cents).toBe(1000);

    // 2. Buyer creates a task (simulate — we deduct and insert directly)
    const taskId = "task_lifecycle_1";
    const priceCents = 100;
    await deductBalance("buyer_1", priceCents, taskId, "task_pay");

    const buyerAfterDeduct = mockBalances.get("buyer_1");
    expect(buyerAfterDeduct!.amount_cents).toBe(900);

    // Insert task into mock DB
    mockTasks.set(taskId, {
      _id: taskId,
      buyer_id: "buyer_1",
      type: "code",
      input: { messages: [{ role: "user", content: "Review this code" }], context: {} },
      input_preview: null,
      sensitive: false,
      constraints: { timeout_seconds: 60, min_output_length: 0 },
      price_cents: priceCents,
      status: "pending",
      worker_id: null,
      assigned_at: null,
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
    });

    // 3. Worker registers
    const { workerId, token, worker } = await registerWorker("claude", null);
    expect(workerId).toMatch(/^w_/);
    expect(token).toMatch(/^ocj_w_/);
    expect(worker.tier).toBe("new");

    // Initialize worker balance for earnings
    await initializeBalance(workerId, 0);

    // 4. Worker authenticates
    const authedWorker = await authenticateWorker(token);
    expect(authedWorker._id).toBe(workerId);

    // 5. Worker claims task
    const claimResult = await claimNextTask(authedWorker);
    expect(claimResult).not.toBeNull();
    expect(claimResult!.task.id).toBe(taskId);
    expect(claimResult!.task.type).toBe("code");
    expect(claimResult!.task.price_cents).toBe(100);

    // Verify task is now assigned
    const assignedTask = mockTasks.get(taskId);
    expect(assignedTask!.status).toBe("assigned");
    expect(assignedTask!.worker_id).toBe(workerId);

    // Verify _internal is NOT in the worker's task view
    expect(claimResult!.task).not.toHaveProperty("_internal");

    // 6. Worker submits result
    const submitResult = await submitTaskResult(
      authedWorker,
      taskId,
      { content: "Code looks good, no issues found.", format: "text" },
    );

    expect(submitResult.taskId).toBe(taskId);
    // 100 * (1 - 0.25) = 75 earned
    expect(submitResult.earnedCents).toBe(75);
    expect(submitResult.stats.tasks_completed).toBe(1);
    expect(submitResult.stats.tier).toBe("new");
    expect(submitResult.stats.next_tier).toBe("proven");

    // Verify task is now completed
    const completedTask = mockTasks.get(taskId);
    expect(completedTask!.status).toBe("completed");
    expect(completedTask!.output).toEqual({
      content: "Code looks good, no issues found.",
      format: "text",
    });

    // Verify worker earnings were frozen (not immediately available)
    const workerBalance = mockBalances.get(workerId);
    expect(workerBalance!.frozen_cents).toBe(75);
    expect(workerBalance!.total_earned).toBe(75);

    // Verify freeze transaction was recorded
    const freezeTx = mockTransactions.find(
      (tx) => tx.type === "freeze" && tx.user_id === workerId,
    );
    expect(freezeTx).toBeDefined();
    expect(freezeTx!.amount_cents).toBe(75);
  });

  it("should reject worker claiming when suspended", async () => {
    const worker: WorkerDocument = {
      _id: "w_suspended",
      token_hash: hashToken("test"),
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
      suspended_until: new Date(Date.now() + 86400000),
      created_at: new Date(),
      last_seen: null,
    };

    await expect(claimNextTask(worker)).rejects.toThrow("Worker suspended");
  });

  it("should return null when no matching tasks available", async () => {
    const { token } = await registerWorker("test", null);
    const worker = await authenticateWorker(token);

    const result = await claimNextTask(worker);
    expect(result).toBeNull();
  });

  it("should reject duplicate submission for already completed task", async () => {
    // Create a completed task
    mockTasks.set("task_done", {
      _id: "task_done",
      buyer_id: "buyer_1",
      type: "chat",
      input: { messages: [{ role: "user", content: "Hi" }], context: {} },
      price_cents: 10,
      status: "completed",
      worker_id: "w_test",
      assigned_at: new Date(),
      deadline: new Date(Date.now() + 60000),
      output: { content: "Hello!", format: "text" },
      completed_at: new Date(),
      created_at: new Date(),
      _internal: { is_qa: false, qa_type: null, original_task_id: null, expected_output: null, qa_result: null, funded_by: "buyer" },
    });

    const { token } = await registerWorker("test", null);
    const worker = await authenticateWorker(token);
    // Override worker_id to match
    const workerWithId = { ...worker, _id: "w_test" };

    await expect(
      submitTaskResult(workerWithId, "task_done", {
        content: "duplicate",
        format: "text",
      }),
    ).rejects.toThrow("cannot be submitted");
  });

  it("should reject submission for task not assigned to this worker", async () => {
    mockTasks.set("task_other", {
      _id: "task_other",
      buyer_id: "buyer_1",
      type: "chat",
      input: { messages: [{ role: "user", content: "Hi" }], context: {} },
      price_cents: 10,
      status: "assigned",
      worker_id: "w_someone_else",
      assigned_at: new Date(),
      deadline: new Date(Date.now() + 60000),
      output: null,
      completed_at: null,
      created_at: new Date(),
      _internal: { is_qa: false, qa_type: null, original_task_id: null, expected_output: null, qa_result: null, funded_by: "buyer" },
    });

    const { token } = await registerWorker("test", null);
    const worker = await authenticateWorker(token);

    await expect(
      submitTaskResult(worker, "task_other", {
        content: "sneaky",
        format: "text",
      }),
    ).rejects.toThrow("not found");
  });
});

describe("E2E: Worker Registration and Auth", () => {
  it("should authenticate worker with the token from registration", async () => {
    const { workerId, token } = await registerWorker("gpt4", {
      provider: "openai",
      model: "gpt-4o",
      capabilities: ["code"],
    });

    const worker = await authenticateWorker(token);
    expect(worker._id).toBe(workerId);
    expect(worker.worker_type).toBe("gpt4");
    expect(worker.model_info?.provider).toBe("openai");
  });

  it("should reject authentication with wrong token", async () => {
    await registerWorker("test", null);

    await expect(
      authenticateWorker("ocj_w_wrong_token_here"),
    ).rejects.toThrow("Invalid worker token");
  });

  it("should update last_seen on authentication", async () => {
    const { workerId, token } = await registerWorker("test", null);

    // Initially last_seen is null
    const workerBefore = mockWorkers.get(workerId);
    expect(workerBefore!.last_seen).toBeNull();

    await authenticateWorker(token);

    const workerAfter = mockWorkers.get(workerId);
    expect(workerAfter!.last_seen).toBeInstanceOf(Date);
  });
});

describe("E2E: Preference-Based Task Filtering", () => {
  it("should only claim tasks matching worker accept preferences", async () => {
    // Create two tasks: one chat, one code
    mockTasks.set("task_chat", {
      _id: "task_chat",
      type: "chat",
      status: "pending",
      price_cents: 10,
      deadline: new Date(Date.now() + 60000),
      created_at: new Date(),
      _internal: { is_qa: false },
    });
    mockTasks.set("task_code", {
      _id: "task_code",
      type: "code",
      status: "pending",
      price_cents: 50,
      deadline: new Date(Date.now() + 60000),
      created_at: new Date(),
      _internal: { is_qa: false },
    });

    const { token } = await registerWorker("test", null);
    const worker = await authenticateWorker(token);

    // Set worker preferences to only accept code tasks
    worker.profile.preferences.accept = ["code"];

    const result = await claimNextTask(worker);
    expect(result).not.toBeNull();
    expect(result!.task.type).toBe("code");
  });
});

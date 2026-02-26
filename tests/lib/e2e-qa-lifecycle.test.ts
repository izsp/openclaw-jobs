/**
 * E2E QA lifecycle tests.
 * Covers: timeout recovery → re-claim, and QA comparison after submit.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state (vi.hoisted ensures availability before mock factories) ───────
const { mockTasks, mockWorkers, mockBalances, mockFrozenEarnings, mockTransactions } = vi.hoisted(() => ({
  mockTasks: new Map<string, Record<string, unknown>>(),
  mockWorkers: new Map<string, Record<string, unknown>>(),
  mockBalances: new Map<string, Record<string, unknown>>(),
  mockFrozenEarnings: new Map<string, Record<string, unknown>>(),
  mockTransactions: [] as Record<string, unknown>[],
}));

function resetState() {
  mockTasks.clear();
  mockWorkers.clear();
  mockBalances.clear();
  mockFrozenEarnings.clear();
  mockTransactions.length = 0;
}

vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: (name: string) => {
      const store =
        name === "task" ? mockTasks
          : name === "worker" ? mockWorkers
            : name === "balance" ? mockBalances
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
        findOne: vi.fn().mockImplementation((filter: Record<string, unknown>) => {
          if (!store) return null;
          for (const doc of store.values()) {
            if (matchesFilter(doc, filter)) return { ...doc };
          }
          return null;
        }),
        findOneAndUpdate: vi.fn().mockImplementation(
          (filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>) => {
            if (!store) return null;
            for (const [key, doc] of store.entries()) {
              if (matchesFilter(doc, filter)) {
                const before = { ...doc };
                applyUpdate(doc, update);
                store.set(key, doc);
                return options?.returnDocument === "before" ? before : { ...doc };
              }
            }
            return null;
          },
        ),
        updateOne: vi.fn().mockImplementation(
          (filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>) => {
            if (!store) return { matchedCount: 0 };
            for (const [key, doc] of store.entries()) {
              if (matchesFilter(doc, filter)) {
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
        find: vi.fn().mockImplementation((filter: Record<string, unknown>) => ({
          toArray: vi.fn().mockImplementation(async () => {
            if (!store) return [];
            return [...store.values()]
              .filter((doc) => {
                if (filter.status && doc.status !== filter.status) return false;
                if (filter.deadline && typeof filter.deadline === "object") {
                  const ops = filter.deadline as Record<string, unknown>;
                  if ("$lt" in ops) {
                    const docDate = (doc.deadline as Date).getTime();
                    const filterDate = (ops.$lt as Date).getTime();
                    if (docDate >= filterDate) return false;
                  }
                }
                return true;
              })
              .map((doc) => ({ ...doc }));
          }),
        })),
        updateMany: vi.fn().mockImplementation(
          (filter: Record<string, unknown>, update: Record<string, unknown>) => {
            if (!store) return { modifiedCount: 0 };
            const ids = (filter._id as Record<string, unknown>)?.$in as string[] ?? [];
            let count = 0;
            for (const id of ids) {
              const doc = store.get(id);
              if (doc && (!filter.status || doc.status === filter.status)) {
                applyUpdate(doc, update);
                count++;
              }
            }
            return { modifiedCount: count };
          },
        ),
      };
    },
  }),
}));

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
      return {
        freeze_window_hours: 24,
        min_withdrawal_cents: 500,
        daily_withdrawal_limit_cents: 50000,
      };
    }
    if (key === "qa") {
      return {
        spot_check_rates: { new: 0, proven: 0, trusted: 0, elite: 0, suspicious: 0 },
        shadow_execution_rate: 0,
        similarity_thresholds: { pass: 0.7, flag: 0.4 },
        penalty: {},
      };
    }
    return null;
  }),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
function matchesFilter(doc: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (key.includes(".")) {
      const parts = key.split(".");
      let current: unknown = doc;
      for (const part of parts) {
        if (current && typeof current === "object") {
          current = (current as Record<string, unknown>)[part];
        } else {
          return false;
        }
      }
      if (current !== value) return false;
      continue;
    }
    if (typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      const ops = value as Record<string, unknown>;
      if ("$gte" in ops && (doc[key] as number) < (ops.$gte as number)) return false;
      if ("$gt" in ops) {
        const docVal = doc[key];
        if (docVal instanceof Date && ops.$gt instanceof Date) {
          if (docVal <= ops.$gt) return false;
        } else if ((docVal as number) <= (ops.$gt as number)) return false;
      }
      if ("$lt" in ops) {
        const docVal = doc[key];
        if (docVal instanceof Date && ops.$lt instanceof Date) {
          if (docVal >= ops.$lt) return false;
        }
      }
      if ("$in" in ops && !(ops.$in as unknown[]).includes(doc[key])) return false;
      if ("$ne" in ops && doc[key] === ops.$ne) return false;
    } else if (doc[key] !== value) {
      return false;
    }
  }
  return true;
}

function applyUpdate(doc: Record<string, unknown>, update: Record<string, unknown>): void {
  if (update.$set) {
    for (const [key, val] of Object.entries(update.$set as Record<string, unknown>)) {
      if (key.includes(".")) {
        setNestedField(doc, key, val);
      } else {
        doc[key] = val;
      }
    }
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

function setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]] || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

// ── Imports ──────────────────────────────────────────────────────────────────
import { recoverExpiredTasks } from "@/lib/services/timeout-recovery";
import { compareQaResult } from "@/lib/services/qa-compare";
import { injectBenchmarkTask } from "@/lib/services/benchmark-inject";
import type { TaskDocument } from "@/lib/types";

beforeEach(() => {
  resetState();
  vi.clearAllMocks();
});

describe("E2E: Timeout Recovery + Re-Claim", () => {
  it("should recover expired task and make it claimable again", async () => {
    // Setup: a task assigned to w_1 that expired
    mockTasks.set("task_timeout", {
      _id: "task_timeout",
      status: "assigned",
      worker_id: "w_1",
      assigned_at: new Date(Date.now() - 120000),
      deadline: new Date(Date.now() - 60000), // expired 1 min ago
      type: "chat",
      price_cents: 10,
    });
    mockWorkers.set("w_1", {
      _id: "w_1",
      tasks_expired: 0,
      consecutive_expires: 0,
    });

    // Recovery cron runs
    const result = await recoverExpiredTasks();
    expect(result.recovered).toBe(1);

    // Task is back to pending
    const task = mockTasks.get("task_timeout")!;
    expect(task.status).toBe("pending");
    expect(task.worker_id).toBeNull();
    expect(task.assigned_at).toBeNull();

    // Worker got penalized
    const worker = mockWorkers.get("w_1")!;
    expect(worker.tasks_expired).toBe(1);
    expect(worker.consecutive_expires).toBe(1);
  });
});

describe("E2E: QA Comparison Flow", () => {
  it("should compare spot-check output against original task", async () => {
    // Original task (completed by a worker)
    mockTasks.set("task_orig", {
      _id: "task_orig",
      type: "chat",
      status: "completed",
      output: { content: "The answer is 42", format: "text" },
      _internal: { is_qa: false },
    });

    // Spot-check task (also completed)
    const spotCheckTask: TaskDocument = {
      _id: "task_spot",
      buyer_id: "platform",
      type: "chat",
      input: { messages: [{ role: "user", content: "Q" }], context: {} },
      input_preview: null,
      sensitive: false,
      constraints: { timeout_seconds: 60, min_output_length: 0 },
      price_cents: 2,
      status: "completed",
      worker_id: "w_checker",
      assigned_at: new Date(),
      deadline: new Date(Date.now() + 60000),
      output: { content: "The answer is 42", format: "text" },
      completed_at: new Date(),
      purge_at: null,
      created_at: new Date(),
      _internal: {
        is_qa: true,
        qa_type: "spot_check",
        original_task_id: "task_orig",
        expected_output: null,
        qa_result: null,
        funded_by: "platform",
      },
    };
    mockTasks.set("task_spot", spotCheckTask as unknown as Record<string, unknown>);
    mockWorkers.set("w_checker", { _id: "w_checker", spot_pass: 0, spot_fail: 0 });

    await compareQaResult(spotCheckTask);

    // QA result should be stored
    const updated = mockTasks.get("task_spot")!;
    const internal = updated._internal as Record<string, unknown>;
    const qaResult = internal.qa_result as Record<string, unknown>;
    expect(qaResult).toBeDefined();
    expect(qaResult.verdict).toBe("pass"); // identical text → high similarity
    expect(qaResult.similarity).toBeGreaterThan(0.7);

    // Worker should get spot_pass incremented
    const worker = mockWorkers.get("w_checker")!;
    expect(worker.spot_pass).toBe(1);
  });

  it("should fail comparison when outputs are very different", async () => {
    mockTasks.set("task_orig2", {
      _id: "task_orig2",
      type: "code",
      status: "completed",
      output: { content: "function add(a, b) { return a + b; }", format: "code" },
      _internal: { is_qa: false },
    });

    const spotCheck: TaskDocument = {
      _id: "task_spot2",
      buyer_id: "platform",
      type: "code",
      input: { messages: [{ role: "user", content: "Write add" }], context: {} },
      input_preview: null,
      sensitive: false,
      constraints: { timeout_seconds: 60, min_output_length: 0 },
      price_cents: 5,
      status: "completed",
      worker_id: "w_bad",
      assigned_at: new Date(),
      deadline: new Date(Date.now() + 60000),
      output: { content: "no", format: "text" },
      completed_at: new Date(),
      purge_at: null,
      created_at: new Date(),
      _internal: {
        is_qa: true,
        qa_type: "spot_check",
        original_task_id: "task_orig2",
        expected_output: null,
        qa_result: null,
        funded_by: "platform",
      },
    };
    mockTasks.set("task_spot2", spotCheck as unknown as Record<string, unknown>);
    mockWorkers.set("w_bad", { _id: "w_bad", spot_pass: 0, spot_fail: 0 });

    await compareQaResult(spotCheck);

    const updated = mockTasks.get("task_spot2")!;
    const internal = updated._internal as Record<string, unknown>;
    const qaResult = internal.qa_result as Record<string, unknown>;
    expect(qaResult.verdict).toBe("fail");

    const worker = mockWorkers.get("w_bad")!;
    expect(worker.spot_fail).toBe(1);
  });
});

describe("E2E: Benchmark Injection + Comparison", () => {
  it("should inject benchmark and compare against expected output", async () => {
    const taskId = await injectBenchmarkTask();
    expect(taskId).toBeTruthy();

    // Verify the injected task
    const task = mockTasks.get(taskId!)!;
    expect(task.status).toBe("pending");
    expect(task.buyer_id).toBe("platform");

    const internal = task._internal as Record<string, unknown>;
    expect(internal.is_qa).toBe(true);
    expect(internal.qa_type).toBe("benchmark");
    expect(internal.expected_output).toBeDefined();
  });
});

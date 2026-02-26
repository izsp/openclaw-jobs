/**
 * Tests for timeout recovery service.
 * Verifies expired tasks are reset and workers penalized for consecutive expires.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock state (vi.hoisted ensures availability before mock factories) ───────
const { mockTasks, mockWorkers } = vi.hoisted(() => ({
  mockTasks: new Map<string, Record<string, unknown>>(),
  mockWorkers: new Map<string, Record<string, unknown>>(),
}));

vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockImplementation(async () => ({
    collection: (name: string) => {
      const store = name === "task" ? mockTasks : name === "worker" ? mockWorkers : null;

      return {
        find: vi.fn().mockImplementation((filter: Record<string, unknown>) => ({
          toArray: vi.fn().mockImplementation(async () => {
            if (!store) return [];
            // WHY: Return shallow copies so updateMany doesn't mutate the returned array
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
          async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
            if (!store) return { modifiedCount: 0 };
            const idFilter = filter._id as Record<string, unknown> | undefined;
            const ids = (idFilter?.$in as string[]) ?? [];
            let count = 0;
            for (const id of ids) {
              const doc = store.get(id);
              if (doc && (!filter.status || doc.status === filter.status)) {
                if (update.$set) Object.assign(doc, update.$set as object);
                count++;
              }
            }
            return { modifiedCount: count };
          },
        ),
        findOneAndUpdate: vi.fn().mockImplementation(
          async (filter: Record<string, unknown>, update: Record<string, unknown>, options?: Record<string, unknown>) => {
            if (!store) return null;
            const doc = store.get(filter._id as string);
            if (!doc) return null;
            if (update.$inc) {
              for (const [key, val] of Object.entries(update.$inc as Record<string, number>)) {
                doc[key] = ((doc[key] as number) || 0) + val;
              }
            }
            if (update.$set) Object.assign(doc, update.$set as object);
            return options?.returnDocument === "after" ? { ...doc } : { ...doc };
          },
        ),
        updateOne: vi.fn().mockImplementation(
          async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
            if (!store) return { matchedCount: 0 };
            const doc = store.get(filter._id as string);
            if (!doc) return { matchedCount: 0 };
            if (update.$set) Object.assign(doc, update.$set as object);
            return { matchedCount: 1 };
          },
        ),
      };
    },
  })),
}));

import { recoverExpiredTasks } from "@/lib/services/timeout-recovery";

beforeEach(() => {
  mockTasks.clear();
  mockWorkers.clear();
  vi.clearAllMocks();
});

describe("recoverExpiredTasks", () => {
  it("should return zero when no tasks are expired", async () => {
    const result = await recoverExpiredTasks();
    expect(result.recovered).toBe(0);
    expect(result.workersPenalized).toEqual([]);
  });

  it("should recover expired assigned tasks", async () => {
    mockTasks.set("task_expired", {
      _id: "task_expired",
      status: "assigned",
      worker_id: "w_lazy",
      deadline: new Date(Date.now() - 10000),
    });
    mockWorkers.set("w_lazy", {
      _id: "w_lazy",
      tasks_expired: 0,
      consecutive_expires: 0,
    });

    const result = await recoverExpiredTasks();
    expect(result.recovered).toBe(1);

    const task = mockTasks.get("task_expired")!;
    expect(task.status).toBe("pending");
    expect(task.worker_id).toBeNull();
  });

  it("should increment worker consecutive_expires", async () => {
    mockTasks.set("task_exp1", {
      _id: "task_exp1",
      status: "assigned",
      worker_id: "w_peeker",
      deadline: new Date(Date.now() - 5000),
    });
    mockWorkers.set("w_peeker", {
      _id: "w_peeker",
      tasks_expired: 0,
      consecutive_expires: 0,
    });

    await recoverExpiredTasks();

    const worker = mockWorkers.get("w_peeker")!;
    expect(worker.tasks_expired).toBe(1);
    expect(worker.consecutive_expires).toBe(1);
  });

  it("should suspend worker after 3 consecutive expires", async () => {
    mockWorkers.set("w_peeker", {
      _id: "w_peeker",
      tasks_expired: 2,
      consecutive_expires: 2,
    });
    mockTasks.set("task_3rd", {
      _id: "task_3rd",
      status: "assigned",
      worker_id: "w_peeker",
      deadline: new Date(Date.now() - 5000),
    });

    const result = await recoverExpiredTasks();

    expect(result.workersPenalized).toContain("w_peeker");
    const worker = mockWorkers.get("w_peeker")!;
    expect(worker.suspended_until).toBeDefined();
    expect(worker.consecutive_expires).toBe(3);
  });

  it("should not include pending tasks in recovery", async () => {
    mockTasks.set("task_pending", {
      _id: "task_pending",
      status: "pending",
      worker_id: null,
      deadline: new Date(Date.now() - 10000),
    });

    const result = await recoverExpiredTasks();
    expect(result.recovered).toBe(0);
  });

  it("should handle multiple expired tasks from different workers", async () => {
    mockTasks.set("task_a", {
      _id: "task_a",
      status: "assigned",
      worker_id: "w_1",
      deadline: new Date(Date.now() - 5000),
    });
    mockTasks.set("task_b", {
      _id: "task_b",
      status: "assigned",
      worker_id: "w_2",
      deadline: new Date(Date.now() - 5000),
    });
    mockWorkers.set("w_1", { _id: "w_1", tasks_expired: 0, consecutive_expires: 0 });
    mockWorkers.set("w_2", { _id: "w_2", tasks_expired: 0, consecutive_expires: 0 });

    const result = await recoverExpiredTasks();
    expect(result.recovered).toBe(2);
  });
});

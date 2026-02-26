import { describe, it, expect, vi, beforeEach } from "vitest";

const mockInsertOne = vi.fn().mockResolvedValue({ insertedId: "task_bench" });

vi.mock("@/lib/db", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: () => ({
      insertOne: mockInsertOne,
    }),
  }),
}));

import { injectBenchmarkTask } from "@/lib/services/benchmark-inject";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("injectBenchmarkTask", () => {
  it("should create a benchmark task with _internal.qa_type = benchmark", async () => {
    const taskId = await injectBenchmarkTask();

    expect(taskId).toBeTruthy();
    expect(taskId).toMatch(/^task_/);

    expect(mockInsertOne).toHaveBeenCalledOnce();
    const inserted = mockInsertOne.mock.calls[0][0];

    expect(inserted._internal.is_qa).toBe(true);
    expect(inserted._internal.qa_type).toBe("benchmark");
    expect(inserted._internal.funded_by).toBe("platform");
    expect(inserted._internal.expected_output).toBeDefined();
  });

  it("should set buyer_id to 'platform'", async () => {
    await injectBenchmarkTask();
    const inserted = mockInsertOne.mock.calls[0][0];
    expect(inserted.buyer_id).toBe("platform");
  });

  it("should set status to pending", async () => {
    await injectBenchmarkTask();
    const inserted = mockInsertOne.mock.calls[0][0];
    expect(inserted.status).toBe("pending");
  });

  it("should set a deadline based on timeout_seconds", async () => {
    await injectBenchmarkTask();
    const inserted = mockInsertOne.mock.calls[0][0];

    expect(inserted.deadline).toBeInstanceOf(Date);
    expect(inserted.deadline.getTime()).toBeGreaterThan(Date.now());
  });

  it("should use a valid task type from templates", async () => {
    await injectBenchmarkTask();
    const inserted = mockInsertOne.mock.calls[0][0];
    expect(["chat", "translate", "code"]).toContain(inserted.type);
  });

  it("should have non-empty input messages", async () => {
    await injectBenchmarkTask();
    const inserted = mockInsertOne.mock.calls[0][0];
    expect(inserted.input.messages.length).toBeGreaterThan(0);
    expect(inserted.input.messages[0].content).toBeTruthy();
  });
});

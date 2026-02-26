import { describe, it, expect } from "vitest";
import {
  createTaskSchema,
  taskIdParamSchema,
  creditTaskSchema,
} from "@/lib/validators/task.validator";

describe("createTaskSchema", () => {
  const validInput = {
    type: "code",
    input: {
      messages: [{ role: "user", content: "Review this function" }],
    },
  };

  it("should accept a valid minimal task", () => {
    const result = createTaskSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("code");
      expect(result.data.sensitive).toBe(false);
      expect(result.data.constraints.timeout_seconds).toBe(60);
    }
  });

  it("should accept skill:* types", () => {
    const result = createTaskSchema.safeParse({
      ...validInput,
      type: "skill:summarize",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid task types", () => {
    const result = createTaskSchema.safeParse({
      ...validInput,
      type: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty messages array", () => {
    const result = createTaskSchema.safeParse({
      ...validInput,
      input: { messages: [] },
    });
    expect(result.success).toBe(false);
  });

  it("should apply default constraints", () => {
    const result = createTaskSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.constraints).toEqual({
        timeout_seconds: 60,
        min_output_length: 0,
      });
    }
  });

  it("should accept custom constraints", () => {
    const result = createTaskSchema.safeParse({
      ...validInput,
      constraints: { timeout_seconds: 300, min_output_length: 50 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.constraints.timeout_seconds).toBe(300);
    }
  });

  it("should reject timeout below 10 seconds", () => {
    const result = createTaskSchema.safeParse({
      ...validInput,
      constraints: { timeout_seconds: 5, min_output_length: 0 },
    });
    expect(result.success).toBe(false);
  });
});

describe("taskIdParamSchema", () => {
  it("should accept valid task IDs", () => {
    expect(taskIdParamSchema.safeParse("task_abc123").success).toBe(true);
  });

  it("should reject IDs without task_ prefix", () => {
    expect(taskIdParamSchema.safeParse("abc123").success).toBe(false);
    expect(taskIdParamSchema.safeParse("").success).toBe(false);
  });
});

describe("creditTaskSchema", () => {
  it("should accept empty body", () => {
    expect(creditTaskSchema.safeParse({}).success).toBe(true);
  });

  it("should accept optional reason", () => {
    const result = creditTaskSchema.safeParse({ reason: "Bad quality" });
    expect(result.success).toBe(true);
  });

  it("should reject reason over 500 chars", () => {
    const result = creditTaskSchema.safeParse({ reason: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});

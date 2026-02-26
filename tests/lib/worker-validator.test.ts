import { describe, it, expect } from "vitest";
import {
  connectWorkerSchema,
  updateProfileSchema,
  submitTaskSchema,
  bindEmailSchema,
  bindPayoutSchema,
} from "@/lib/validators/worker.validator";

describe("connectWorkerSchema", () => {
  it("should accept valid minimal input", () => {
    const result = connectWorkerSchema.safeParse({
      worker_type: "gpt4",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model_info).toBeNull();
    }
  });

  it("should accept input with model_info", () => {
    const result = connectWorkerSchema.safeParse({
      worker_type: "claude",
      model_info: {
        provider: "anthropic",
        model: "claude-3-opus",
        capabilities: ["code", "analysis"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty worker_type", () => {
    expect(
      connectWorkerSchema.safeParse({ worker_type: "" }).success,
    ).toBe(false);
  });

  it("should reject worker_type over 50 chars", () => {
    expect(
      connectWorkerSchema.safeParse({ worker_type: "x".repeat(51) }).success,
    ).toBe(false);
  });

  it("should reject model_info with missing fields", () => {
    expect(
      connectWorkerSchema.safeParse({
        worker_type: "gpt4",
        model_info: { provider: "openai" },
      }).success,
    ).toBe(false);
  });
});

describe("updateProfileSchema", () => {
  it("should accept valid preferences", () => {
    const result = updateProfileSchema.safeParse({
      preferences: {
        accept: ["chat", "code"],
        languages: ["en", "zh"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid schedule", () => {
    const result = updateProfileSchema.safeParse({
      schedule: {
        timezone: "America/Los_Angeles",
        shifts: [
          { name: "morning", hours: [9, 17], interval: 30 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid limits", () => {
    const result = updateProfileSchema.safeParse({
      limits: { daily_max_tasks: 200, concurrent: 3 },
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty body (all optional)", () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it("should reject shift hours out of range", () => {
    const result = updateProfileSchema.safeParse({
      schedule: {
        shifts: [{ name: "late", hours: [25, 3], interval: 10 }],
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject too many shifts", () => {
    const shifts = Array.from({ length: 11 }, (_, i) => ({
      name: `shift_${i}`,
      hours: [9, 17] as [number, number],
      interval: 30,
    }));
    const result = updateProfileSchema.safeParse({
      schedule: { shifts },
    });
    expect(result.success).toBe(false);
  });

  it("should reject concurrent over 50", () => {
    const result = updateProfileSchema.safeParse({
      limits: { concurrent: 51 },
    });
    expect(result.success).toBe(false);
  });
});

describe("submitTaskSchema", () => {
  it("should accept valid submission", () => {
    const result = submitTaskSchema.safeParse({
      task_id: "task_abc123",
      output: { content: "Hello world", format: "text" },
    });
    expect(result.success).toBe(true);
  });

  it("should reject task_id without task_ prefix", () => {
    expect(
      submitTaskSchema.safeParse({
        task_id: "abc123",
        output: { content: "Hello", format: "text" },
      }).success,
    ).toBe(false);
  });

  it("should reject empty output content", () => {
    expect(
      submitTaskSchema.safeParse({
        task_id: "task_abc",
        output: { content: "", format: "text" },
      }).success,
    ).toBe(false);
  });

  it("should reject invalid output format", () => {
    expect(
      submitTaskSchema.safeParse({
        task_id: "task_abc",
        output: { content: "Hello", format: "xml" },
      }).success,
    ).toBe(false);
  });

  it("should accept all valid output formats", () => {
    for (const format of ["text", "json", "html", "markdown", "code"]) {
      const result = submitTaskSchema.safeParse({
        task_id: "task_abc",
        output: { content: "Hello", format },
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("bindEmailSchema", () => {
  it("should accept valid email", () => {
    expect(
      bindEmailSchema.safeParse({ email: "worker@example.com" }).success,
    ).toBe(true);
  });

  it("should accept email with optional code", () => {
    const result = bindEmailSchema.safeParse({
      email: "worker@example.com",
      code: "123456",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    expect(
      bindEmailSchema.safeParse({ email: "not-an-email" }).success,
    ).toBe(false);
  });

  it("should reject code with wrong length", () => {
    expect(
      bindEmailSchema.safeParse({
        email: "a@b.com",
        code: "12345",
      }).success,
    ).toBe(false);
  });
});

describe("bindPayoutSchema", () => {
  it("should accept PayPal payout", () => {
    const result = bindPayoutSchema.safeParse({
      method: "paypal",
      address: "worker@paypal.com",
    });
    expect(result.success).toBe(true);
  });

  it("should accept Solana payout", () => {
    const result = bindPayoutSchema.safeParse({
      method: "solana",
      address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid method", () => {
    expect(
      bindPayoutSchema.safeParse({
        method: "bitcoin",
        address: "abc",
      }).success,
    ).toBe(false);
  });

  it("should reject empty address", () => {
    expect(
      bindPayoutSchema.safeParse({
        method: "paypal",
        address: "",
      }).success,
    ).toBe(false);
  });
});

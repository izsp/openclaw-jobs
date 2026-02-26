import { describe, it, expect } from "vitest";
import { requestWithdrawalSchema } from "@/lib/validators/withdrawal.validator";

describe("requestWithdrawalSchema", () => {
  it("should accept valid withdrawal amount", () => {
    const result = requestWithdrawalSchema.safeParse({ amount_cents: 500 });
    expect(result.success).toBe(true);
  });

  it("should reject zero amount", () => {
    const result = requestWithdrawalSchema.safeParse({ amount_cents: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject negative amount", () => {
    const result = requestWithdrawalSchema.safeParse({ amount_cents: -100 });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer amount", () => {
    const result = requestWithdrawalSchema.safeParse({ amount_cents: 10.5 });
    expect(result.success).toBe(false);
  });

  it("should reject missing amount", () => {
    const result = requestWithdrawalSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

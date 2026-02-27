import { describe, it, expect } from "vitest";
import { createDepositSchema } from "@/lib/validators/deposit.validator";

describe("createDepositSchema", () => {
  it("should accept valid deposit amounts", () => {
    for (const amount of [500, 2000, 10000, 50000]) {
      const result = createDepositSchema.safeParse({ amount_cents: amount });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid amounts", () => {
    expect(
      createDepositSchema.safeParse({ amount_cents: 100 }).success,
    ).toBe(false);
    expect(
      createDepositSchema.safeParse({ amount_cents: 999 }).success,
    ).toBe(false);
    expect(
      createDepositSchema.safeParse({ amount_cents: -500 }).success,
    ).toBe(false);
  });

  it("should reject non-integer amounts", () => {
    expect(
      createDepositSchema.safeParse({ amount_cents: 500.5 }).success,
    ).toBe(false);
  });

  it("should reject missing amount", () => {
    expect(createDepositSchema.safeParse({}).success).toBe(false);
  });
});

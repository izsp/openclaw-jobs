import { describe, it, expect } from "vitest";
import { configKeySchema, configUpdateSchema } from "@/lib/validators/config.validator";

describe("configKeySchema", () => {
  it("should accept valid config keys", () => {
    const validKeys = ["pricing", "tiers", "commissions", "signup", "qa", "rate_limits"];
    for (const key of validKeys) {
      expect(configKeySchema.safeParse(key).success).toBe(true);
    }
  });

  it("should reject invalid config keys", () => {
    expect(configKeySchema.safeParse("invalid").success).toBe(false);
    expect(configKeySchema.safeParse("").success).toBe(false);
    expect(configKeySchema.safeParse(123).success).toBe(false);
  });
});

describe("configUpdateSchema", () => {
  it("should accept a valid update object", () => {
    const result = configUpdateSchema.safeParse({ standard: 0.15 });
    expect(result.success).toBe(true);
  });

  it("should reject updates containing _id", () => {
    const result = configUpdateSchema.safeParse({ _id: "pricing", standard: 0.15 });
    expect(result.success).toBe(false);
  });

  it("should accept an empty object (no-op update)", () => {
    const result = configUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

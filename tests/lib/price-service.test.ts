import { describe, it, expect, vi, beforeEach } from "vitest";
import { estimateTaskPrice } from "@/lib/services/price-service";

// Mock the config loader
vi.mock("@/lib/config", () => ({
  getConfig: vi.fn(),
}));

import { getConfig } from "@/lib/config";
const mockGetConfig = vi.mocked(getConfig);

describe("estimateTaskPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return base_cents for a simple task type", async () => {
    mockGetConfig.mockResolvedValue({
      _id: "pricing",
      code: { base_cents: 5 },
    } as ReturnType<typeof getConfig> extends Promise<infer T> ? T : never);

    const price = await estimateTaskPrice("code", 1);
    expect(price).toBe(5);
  });

  it("should use multi-turn pricing when available", async () => {
    mockGetConfig.mockResolvedValue({
      _id: "pricing",
      chat: {
        base_cents: 2,
        multi_turn: [
          { up_to_message: 3, price_cents: 2 },
          { up_to_message: 7, price_cents: 5 },
          { up_to_message: 999, price_cents: 10 },
        ],
      },
    } as ReturnType<typeof getConfig> extends Promise<infer T> ? T : never);

    expect(await estimateTaskPrice("chat", 1)).toBe(2);
    expect(await estimateTaskPrice("chat", 3)).toBe(2);
    expect(await estimateTaskPrice("chat", 5)).toBe(5);
    expect(await estimateTaskPrice("chat", 50)).toBe(10);
  });

  it("should fall back to 5 cents when config is missing", async () => {
    mockGetConfig.mockResolvedValue(null);
    const price = await estimateTaskPrice("chat", 1);
    expect(price).toBe(5);
  });

  it("should fall back to 5 cents for unknown task type", async () => {
    mockGetConfig.mockResolvedValue({
      _id: "pricing",
      chat: { base_cents: 2 },
    } as ReturnType<typeof getConfig> extends Promise<infer T> ? T : never);

    const price = await estimateTaskPrice("unknown", 1);
    expect(price).toBe(5);
  });

  it("should map skill:* types to code pricing", async () => {
    mockGetConfig.mockResolvedValue({
      _id: "pricing",
      code: { base_cents: 5 },
    } as ReturnType<typeof getConfig> extends Promise<infer T> ? T : never);

    const price = await estimateTaskPrice("skill:summarize", 1);
    expect(price).toBe(5);
  });
});

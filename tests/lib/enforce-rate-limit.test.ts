/**
 * Tests for rate limit enforcement integration.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { enforceRateLimit, enforceWorkerRateLimit } from "@/lib/enforce-rate-limit";
import { resetAllRateLimits } from "@/lib/services/rate-limiter";

// Mock getConfig to return test rate limits
vi.mock("@/lib/config", () => ({
  getConfig: vi.fn().mockResolvedValue({
    _id: "rate_limits",
    registration: { per_ip_per_min: 3 },
    work_next: { per_ip_per_min: 10, established_per_min: 20 },
    task_submit: { per_min: 5 },
    withdrawal: { per_ip_per_min: 2 },
  }),
}));

function makeRequest(ip: string): Request {
  return new Request("http://localhost/test", {
    headers: { "cf-connecting-ip": ip },
  });
}

beforeEach(() => {
  resetAllRateLimits();
});

describe("enforceRateLimit", () => {
  it("should allow requests within limit", async () => {
    await expect(
      enforceRateLimit(makeRequest("1.2.3.4"), "registration"),
    ).resolves.toBeUndefined();
  });

  it("should reject after exceeding registration limit (3/min)", async () => {
    const req = makeRequest("1.2.3.4");
    await enforceRateLimit(req, "registration");
    await enforceRateLimit(makeRequest("1.2.3.4"), "registration");
    await enforceRateLimit(makeRequest("1.2.3.4"), "registration");

    await expect(
      enforceRateLimit(makeRequest("1.2.3.4"), "registration"),
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("should not block different IPs", async () => {
    for (let i = 0; i < 3; i++) {
      await enforceRateLimit(makeRequest("1.1.1.1"), "registration");
    }
    // Different IP should still be allowed
    await expect(
      enforceRateLimit(makeRequest("2.2.2.2"), "registration"),
    ).resolves.toBeUndefined();
  });

  it("should enforce task_submit limits", async () => {
    for (let i = 0; i < 5; i++) {
      await enforceRateLimit(makeRequest("3.3.3.3"), "task_submit");
    }
    await expect(
      enforceRateLimit(makeRequest("3.3.3.3"), "task_submit"),
    ).rejects.toThrow("Rate limit exceeded");
  });
});

describe("enforceWorkerRateLimit", () => {
  it("should allow requests within limit", async () => {
    await expect(
      enforceWorkerRateLimit("hash123", "work_next"),
    ).resolves.toBeUndefined();
  });

  it("should reject after exceeding token-based limit", async () => {
    // established_per_min is 20 for work_next
    for (let i = 0; i < 20; i++) {
      await enforceWorkerRateLimit("hash456", "work_next");
    }
    await expect(
      enforceWorkerRateLimit("hash456", "work_next"),
    ).rejects.toThrow("Rate limit exceeded");
  });
});

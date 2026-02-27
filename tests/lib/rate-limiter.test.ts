/**
 * Tests for the in-memory sliding window rate limiter.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  checkRateLimit,
  resetAllRateLimits,
} from "@/lib/services/rate-limiter";

beforeEach(() => {
  resetAllRateLimits();
});

describe("checkRateLimit", () => {
  it("should allow requests within the limit", () => {
    const result = checkRateLimit("test", "ip-1", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("should decrement remaining count on each request", () => {
    checkRateLimit("test", "ip-1", 3, 60_000);
    checkRateLimit("test", "ip-1", 3, 60_000);
    const result = checkRateLimit("test", "ip-1", 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should reject requests exceeding the limit", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("test", "ip-1", 3, 60_000);
    }
    const result = checkRateLimit("test", "ip-1", 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetMs).toBeGreaterThan(0);
  });

  it("should track different identifiers independently", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("test", "ip-1", 3, 60_000);
    }
    const blocked = checkRateLimit("test", "ip-1", 3, 60_000);
    expect(blocked.allowed).toBe(false);

    const allowed = checkRateLimit("test", "ip-2", 3, 60_000);
    expect(allowed.allowed).toBe(true);
  });

  it("should track different operations independently", () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit("registration", "ip-1", 3, 60_000);
    }
    const blocked = checkRateLimit("registration", "ip-1", 3, 60_000);
    expect(blocked.allowed).toBe(false);

    const allowed = checkRateLimit("task_submit", "ip-1", 3, 60_000);
    expect(allowed.allowed).toBe(true);
  });

  it("should reset after the window expires", async () => {
    // Use a short window (50ms) and wait for it to pass
    for (let i = 0; i < 3; i++) {
      checkRateLimit("test", "ip-1", 3, 50);
    }
    const blocked = checkRateLimit("test", "ip-1", 3, 50);
    expect(blocked.allowed).toBe(false);

    // Wait for the window to expire
    await new Promise((r) => setTimeout(r, 60));
    const result = checkRateLimit("test", "ip-1", 3, 50);
    expect(result.allowed).toBe(true);
  });

  it("should provide a positive resetMs when rate limited", () => {
    for (let i = 0; i < 2; i++) {
      checkRateLimit("test", "ip-1", 2, 60_000);
    }
    const result = checkRateLimit("test", "ip-1", 2, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.resetMs).toBeGreaterThan(0);
    expect(result.resetMs).toBeLessThanOrEqual(60_000);
  });
});

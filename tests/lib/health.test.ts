/**
 * Tests for the health check endpoint logic.
 * Tests the response structure (does not require a real MongoDB connection).
 */
import { describe, it, expect, vi } from "vitest";

// Mock the db module before importing the route
vi.mock("@/lib/db", () => ({
  getMongoClient: vi.fn().mockResolvedValue({
    db: () => ({
      command: vi.fn().mockResolvedValue({ ok: 1 }),
    }),
  }),
}));

describe("GET /api/health", () => {
  it("should return healthy status when MongoDB is reachable", async () => {
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.checks.mongodb.status).toBe("ok");
    expect(typeof body.checks.mongodb.latency_ms).toBe("number");
  });

  it("should return degraded status when MongoDB fails", async () => {
    const dbMod = await import("@/lib/db");
    vi.mocked(dbMod.getMongoClient).mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    // Need to re-import to pick up the mock change for this call
    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.checks.mongodb.status).toBe("error");
  });
});

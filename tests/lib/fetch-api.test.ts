/**
 * Tests for the shared fetch wrapper (lib/api/fetch-api.ts).
 * Verifies JSON unwrapping, error extraction, and type safety.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchApi, ApiError } from "@/lib/api/fetch-api";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();
});

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response;
}

describe("fetchApi", () => {
  it("should unwrap successful response data", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: { amount: 42 } }),
    );

    const result = await fetchApi<{ amount: number }>("/api/test");
    expect(result).toEqual({ amount: 42 });
  });

  it("should pass Content-Type and custom headers", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: null }),
    );

    await fetchApi("/api/test", {
      headers: { "X-Custom": "value" },
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      headers: {
        "Content-Type": "application/json",
        "X-Custom": "value",
      },
    }));
  });

  it("should forward method and body options", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: { id: "t_1" } }),
    );

    await fetchApi("/api/task", {
      method: "POST",
      body: JSON.stringify({ type: "chat" }),
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/task", expect.objectContaining({
      method: "POST",
      body: '{"type":"chat"}',
    }));
  });

  it("should throw ApiError with code and status on error response", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(
        { success: false, error: "Insufficient balance", code: "BALANCE_ERROR" },
        400,
      ),
    );

    await expect(fetchApi("/api/task")).rejects.toThrow(ApiError);

    try {
      await fetchApi("/api/task");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe("Insufficient balance");
      expect(apiErr.code).toBe("BALANCE_ERROR");
      expect(apiErr.status).toBe(400);
    }
  });

  it("should throw ApiError for non-ok status even with success: true", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: true, data: null }, 500),
    );

    await expect(fetchApi("/api/test")).rejects.toThrow(ApiError);
  });

  it("should use default error message and code when missing", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ success: false }, 422),
    );

    try {
      await fetchApi("/api/test");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe("Request failed");
      expect(apiErr.code).toBe("UNKNOWN_ERROR");
    }
  });
});

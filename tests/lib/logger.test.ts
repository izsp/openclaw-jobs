/**
 * Tests for the structured logger.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { logRequest, logWarn, logError } from "@/lib/logger";

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("logRequest", () => {
  it("should log info for 2xx status", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logRequest("OK", { status: 200, request_id: "abc" });
    expect(spy).toHaveBeenCalled();
  });

  it("should log warn for 4xx status", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logRequest("Bad request", { status: 400 });
    expect(spy).toHaveBeenCalled();
  });

  it("should log error for 5xx status", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logRequest("Server error", { status: 500 });
    expect(spy).toHaveBeenCalled();
  });

  it("should default to info when no status provided", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logRequest("No status");
    expect(spy).toHaveBeenCalled();
  });
});

describe("logWarn", () => {
  it("should output a warning message", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logWarn("Something concerning", { request_id: "xyz" });
    expect(spy).toHaveBeenCalled();
  });
});

describe("logError", () => {
  it("should output an error message", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logError("Something broke", { error_code: "DB_FAIL" });
    expect(spy).toHaveBeenCalled();
  });
});

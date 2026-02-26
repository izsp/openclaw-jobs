import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  BalanceError,
  ConflictError,
  RateLimitError,
  PayloadTooLargeError,
  SuspendedError,
} from "@/lib/errors";

describe("Error classes", () => {
  it("should create AppError with correct properties", () => {
    const err = new AppError("test", 500, "TEST");
    expect(err.message).toBe("test");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("TEST");
    expect(err.name).toBe("AppError");
    expect(err).toBeInstanceOf(Error);
  });

  it("should create ValidationError with 400 status", () => {
    const err = new ValidationError("bad input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("bad input");
  });

  it("should create AuthError with default message", () => {
    const err = new AuthError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("AUTH_ERROR");
    expect(err.message).toBe("Authentication required");
  });

  it("should create ForbiddenError with default message", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
  });

  it("should create NotFoundError with resource name", () => {
    const err = new NotFoundError("Task");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Task not found");
  });

  it("should create BalanceError with 400 status", () => {
    const err = new BalanceError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("should create ConflictError with 409 status", () => {
    const err = new ConflictError("already exists");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });

  it("should create RateLimitError with 429 status", () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
  });

  it("should create PayloadTooLargeError with limit in message", () => {
    const err = new PayloadTooLargeError(1024);
    expect(err.statusCode).toBe(413);
    expect(err.message).toBe("Payload exceeds 1024 bytes");
  });

  it("should create SuspendedError with date in message", () => {
    const date = new Date("2026-03-01T00:00:00Z");
    const err = new SuspendedError(date);
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("WORKER_SUSPENDED");
    expect(err.message).toContain("2026-03-01");
  });
});

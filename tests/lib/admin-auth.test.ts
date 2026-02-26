import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { AuthError } from "@/lib/errors";

describe("verifyAdminAuth", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV, ADMIN_SECRET: "test-secret-123" };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("should pass with valid admin token", () => {
    const request = new Request("http://localhost/api/admin/config/pricing", {
      headers: { authorization: "Bearer test-secret-123" },
    });
    expect(() => verifyAdminAuth(request)).not.toThrow();
  });

  it("should throw AuthError when ADMIN_SECRET is not set", () => {
    delete process.env.ADMIN_SECRET;
    const request = new Request("http://localhost/api/admin/config/pricing", {
      headers: { authorization: "Bearer anything" },
    });
    expect(() => verifyAdminAuth(request)).toThrow(AuthError);
    expect(() => verifyAdminAuth(request)).toThrow("not configured");
  });

  it("should throw AuthError when no authorization header", () => {
    const request = new Request("http://localhost/api/admin/config/pricing");
    expect(() => verifyAdminAuth(request)).toThrow(AuthError);
    expect(() => verifyAdminAuth(request)).toThrow("Missing");
  });

  it("should throw AuthError when token is wrong", () => {
    const request = new Request("http://localhost/api/admin/config/pricing", {
      headers: { authorization: "Bearer wrong-token" },
    });
    expect(() => verifyAdminAuth(request)).toThrow(AuthError);
    expect(() => verifyAdminAuth(request)).toThrow("Invalid");
  });

  it("should throw AuthError for non-Bearer auth", () => {
    const request = new Request("http://localhost/api/admin/config/pricing", {
      headers: { authorization: "Basic dXNlcjpwYXNz" },
    });
    expect(() => verifyAdminAuth(request)).toThrow(AuthError);
  });
});

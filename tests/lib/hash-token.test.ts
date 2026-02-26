import { describe, it, expect } from "vitest";
import { generateWorkerToken, hashToken } from "@/lib/hash-token";
import { ID_PREFIX } from "@/lib/constants";

describe("generateWorkerToken", () => {
  it("should generate a token with the correct prefix", () => {
    const token = generateWorkerToken();
    expect(token.startsWith(ID_PREFIX.TOKEN)).toBe(true);
  });

  it("should generate tokens of consistent length", () => {
    const token = generateWorkerToken();
    // Prefix (6 chars "ocj_w_") + 64 hex chars (32 bytes)
    expect(token.length).toBe(ID_PREFIX.TOKEN.length + 64);
  });

  it("should generate unique tokens", () => {
    const tokens = new Set(
      Array.from({ length: 100 }, () => generateWorkerToken()),
    );
    expect(tokens.size).toBe(100);
  });
});

describe("hashToken", () => {
  it("should return a 64-character hex SHA-256 hash", () => {
    const hash = hashToken("test_token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should produce the same hash for the same input", () => {
    const hash1 = hashToken("same_token");
    const hash2 = hashToken("same_token");
    expect(hash1).toBe(hash2);
  });

  it("should produce different hashes for different inputs", () => {
    const hash1 = hashToken("token_a");
    const hash2 = hashToken("token_b");
    expect(hash1).not.toBe(hash2);
  });

  it("should not match the raw token", () => {
    const raw = "ocj_w_abc123";
    const hash = hashToken(raw);
    expect(hash).not.toBe(raw);
    expect(hash).not.toContain(raw);
  });
});

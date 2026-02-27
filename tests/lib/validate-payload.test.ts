/**
 * Tests for payload size validation.
 */
import { describe, it, expect } from "vitest";
import { readJsonBody } from "@/lib/validate-payload";

function makeRequest(body: string, contentLength?: string): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (contentLength !== undefined) {
    headers["content-length"] = contentLength;
  }
  return new Request("http://localhost/test", {
    method: "POST",
    headers,
    body,
  });
}

describe("readJsonBody", () => {
  it("should parse valid JSON within the size limit", async () => {
    const body = JSON.stringify({ name: "test" });
    const result = await readJsonBody(makeRequest(body), 1024);
    expect(result).toEqual({ name: "test" });
  });

  it("should reject body exceeding Content-Length header", async () => {
    const body = JSON.stringify({ data: "x".repeat(100) });
    await expect(
      readJsonBody(makeRequest(body, "99999"), 50),
    ).rejects.toThrow("Payload exceeds");
  });

  it("should reject body exceeding actual byte size", async () => {
    const body = JSON.stringify({ data: "x".repeat(200) });
    await expect(readJsonBody(makeRequest(body), 50)).rejects.toThrow(
      "Payload exceeds",
    );
  });

  it("should reject invalid JSON", async () => {
    await expect(
      readJsonBody(makeRequest("not json"), 1024),
    ).rejects.toThrow("Invalid JSON body");
  });

  it("should accept body exactly at the size limit", async () => {
    const body = JSON.stringify({ a: 1 });
    const byteSize = new TextEncoder().encode(body).byteLength;
    const result = await readJsonBody(makeRequest(body), byteSize);
    expect(result).toEqual({ a: 1 });
  });

  it("should handle empty body as invalid JSON", async () => {
    await expect(readJsonBody(makeRequest(""), 1024)).rejects.toThrow(
      "Invalid JSON body",
    );
  });
});

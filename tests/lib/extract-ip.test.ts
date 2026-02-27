/**
 * Tests for IP address extraction from request headers.
 */
import { describe, it, expect } from "vitest";
import { extractIp } from "@/lib/extract-ip";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost/test", { headers });
}

describe("extractIp", () => {
  it("should extract IP from cf-connecting-ip header", () => {
    const ip = extractIp(makeRequest({ "cf-connecting-ip": "1.2.3.4" }));
    expect(ip).toBe("1.2.3.4");
  });

  it("should extract IP from x-real-ip header", () => {
    const ip = extractIp(makeRequest({ "x-real-ip": "10.0.0.1" }));
    expect(ip).toBe("10.0.0.1");
  });

  it("should extract first IP from x-forwarded-for", () => {
    const ip = extractIp(
      makeRequest({ "x-forwarded-for": "5.6.7.8, 10.0.0.1, 192.168.1.1" }),
    );
    expect(ip).toBe("5.6.7.8");
  });

  it("should prioritize cf-connecting-ip over others", () => {
    const ip = extractIp(
      makeRequest({
        "cf-connecting-ip": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
        "x-forwarded-for": "3.3.3.3",
      }),
    );
    expect(ip).toBe("1.1.1.1");
  });

  it("should return 'unknown' when no IP headers present", () => {
    const ip = extractIp(makeRequest({}));
    expect(ip).toBe("unknown");
  });

  it("should handle empty header values gracefully", () => {
    const ip = extractIp(makeRequest({ "cf-connecting-ip": "" }));
    // Falls through to next header or "unknown"
    expect(ip).toBe("unknown");
  });
});

import { describe, it, expect } from "vitest";
import { generateRequestId } from "@/lib/request-id";

describe("generateRequestId", () => {
  it("should return a 12-character string", () => {
    const id = generateRequestId();
    expect(id).toHaveLength(12);
    expect(typeof id).toBe("string");
  });

  it("should generate unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateRequestId()));
    expect(ids.size).toBe(100);
  });
});

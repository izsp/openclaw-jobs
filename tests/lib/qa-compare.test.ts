import { describe, it, expect } from "vitest";
import { computeSimilarity } from "@/lib/services/qa-compare";

describe("computeSimilarity (Jaccard word overlap)", () => {
  it("should return 1 for identical texts", () => {
    expect(computeSimilarity("hello world", "hello world")).toBe(1);
  });

  it("should return 0 for completely different texts", () => {
    expect(computeSimilarity("hello world", "foo bar")).toBe(0);
  });

  it("should return partial overlap score", () => {
    // "hello" is shared; union = {hello, world, there} = 3; intersection = 1
    const score = computeSimilarity("hello world", "hello there");
    expect(score).toBeCloseTo(1 / 3, 2);
  });

  it("should be case-insensitive", () => {
    expect(computeSimilarity("Hello World", "hello world")).toBe(1);
  });

  it("should return 1 for two empty strings", () => {
    expect(computeSimilarity("", "")).toBe(1);
  });

  it("should return 0 when one string is empty", () => {
    expect(computeSimilarity("hello", "")).toBe(0);
    expect(computeSimilarity("", "hello")).toBe(0);
  });

  it("should handle multi-word overlap correctly", () => {
    // Words A: {the, quick, brown, fox}
    // Words B: {the, lazy, brown, dog}
    // Intersection: {the, brown} = 2, Union: 6
    const score = computeSimilarity(
      "the quick brown fox",
      "the lazy brown dog",
    );
    expect(score).toBeCloseTo(2 / 6, 2);
  });

  it("should ignore extra whitespace", () => {
    const score = computeSimilarity("hello   world", "hello world");
    expect(score).toBe(1);
  });
});

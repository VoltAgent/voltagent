import { describe, expect, it } from "vitest";
import { SlumberChunker } from "../chunkers/slumber-chunker";

describe("SlumberChunker", () => {
  it("smooths small chunks into larger windows", () => {
    const text = "A short sentence. Tiny. Another small one. Final small piece.";
    const chunker = new SlumberChunker();

    const chunks = chunker.chunk(text, { maxTokens: 12, minTokens: 6 });

    expect(chunks.length).toBeLessThan(4);
    expect(chunks[0]?.tokens).toBeGreaterThanOrEqual(6);
  });

  it("clamps minTokens when larger than maxTokens", () => {
    const text = "One two three.";
    const chunker = new SlumberChunker();
    const chunks = chunker.chunk(text, { maxTokens: 4, minTokens: 10 });
    expect(chunks.length).toBe(1);
    expect(chunks[0]?.tokens).toBeGreaterThan(0);
  });
});

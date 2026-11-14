import { describe, expect, it } from "vitest";
import { SentenceChunker } from "../chunkers/sentence-chunker";

describe("SentenceChunker", () => {
  it("keeps decimals intact with the default sentence tokenizer", () => {
    const text = "Version 2.5 is out. It costs $3.99 today.";
    const expected = ["Version 2.5 is out.", " It costs $3.99 today."];
    const chunks = new SentenceChunker().chunk(text, { maxTokens: 4 });
    expect(chunks.map((chunk) => chunk.content)).toEqual(expected);
  });

  it("groups sentences under token budget", () => {
    const chunker = new SentenceChunker();
    const text =
      "First sentence is short. Second sentence is also short. This third one is a bit longer so it should force a new chunk.";
    const chunks = chunker.chunk(text, { maxTokens: 10 });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const allText = chunks.map((c) => c.content).join(" ");
    expect(allText).toContain("First sentence is short");
    expect(allText).toContain("Second sentence");
    expect(allText).toContain("This third one");
  });

  it("handles maxTokens of 1 by splitting every sentence", () => {
    const chunker = new SentenceChunker();
    const text = "A. B. C.";
    const chunks = chunker.chunk(text, { maxTokens: 1 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.every((c) => (c.tokens ?? 0) <= 2)).toBe(true);
  });

  it("returns empty for whitespace-only input", () => {
    const chunker = new SentenceChunker();
    expect(chunker.chunk("   ", { maxTokens: 5 })).toEqual([]);
  });
});

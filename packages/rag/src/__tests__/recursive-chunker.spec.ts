import { describe, expect, it } from "vitest";
import { RecursiveChunker } from "../chunkers/recursive-chunker";
import { defaultTokenizer as tokenizer } from "../utils/tokenizer";

describe("RecursiveChunker", () => {
  it("splits long paragraphs then falls back to sentence/token chunking", () => {
    const text = [
      "Paragraph one short.",
      "Paragraph two is intentionally very long and will need to be broken down into multiple sentences to respect the token limits set on the chunker. It keeps going to make sure we pass the threshold.",
    ].join("\n\n");

    const chunker = new RecursiveChunker();
    const chunks = chunker.chunk(text, { maxTokens: 12 });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]?.content).toContain("Paragraph one short");
    expect(chunks.some((c) => c.content.includes("Paragraph two"))).toBe(true);
  });

  it("applies overlap tokens between chunks when configured", () => {
    const text = "First part is here. Second part follows soon. Third part concludes.";
    const chunker = new RecursiveChunker();
    const chunks = chunker.chunk(text, { maxTokens: 6, overlapTokens: 3 });
    const overlap = chunks.filter((c) => c.label?.includes("overlap"));
    expect(overlap.length).toBeGreaterThan(0);
  });

  it("slices overlap content by whole tokens, not characters", () => {
    const text = "First part is here. Second part follows soon. Third part concludes.";
    const chunker = new RecursiveChunker();
    const chunks = chunker.chunk(text, { maxTokens: 6, overlapTokens: 3 });
    const overlap = chunks.filter((c) => c.label?.includes("overlap"));
    expect(overlap.length).toBeGreaterThan(0);
    for (const chunk of overlap) {
      const nextIndex = chunks.indexOf(chunk) + 1;
      const next = chunks[nextIndex];
      expect(next).toBeDefined();
      // the overlap chunk is a whole-token prefix of the following chunk:
      // exactly overlapTokens tokens, never a mid-word character fragment
      // (before the fix this produced fragments like "Fir" or " he").
      expect(next?.content.startsWith(chunk.content)).toBe(true);
      expect(tokenizer.countTokens(chunk.content)).toBe(3);
    }
  });
});

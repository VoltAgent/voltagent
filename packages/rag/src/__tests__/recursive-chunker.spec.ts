import { describe, expect, it } from "vitest";
import { RecursiveChunker } from "../chunkers/recursive-chunker";
import { whitespaceTokenizer } from "../utils/tokenizer";

describe("RecursiveChunker", () => {
  it.each([
    "Alpha one. Beta two. Gamma three. Delta four.",
    "Intro.\n\nAlpha one. Beta two. This sentence has enough words to need several token chunks. End.",
  ])("assigns distinct IDs to expanded chunks for %s", (text) => {
    const chunks = new RecursiveChunker(whitespaceTokenizer).chunk(text, { maxTokens: 4 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(new Set(chunks.map((chunk) => chunk.id)).size).toBe(chunks.length);
  });

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
});

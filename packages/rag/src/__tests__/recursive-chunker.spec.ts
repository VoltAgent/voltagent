import { describe, expect, it } from "vitest";
import { RecursiveChunker } from "../chunkers/recursive-chunker";
import { defaultTokenizer, whitespaceTokenizer } from "../utils/tokenizer";

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

  it.each([
    { name: "whitespace", tokenizer: whitespaceTokenizer },
    { name: "tiktoken", tokenizer: defaultTokenizer },
  ])("retains later sentence offsets in token fallback ($name)", ({ tokenizer }) => {
    const text = "A preamble.\n\nOne. Two. alpha beta gamma delta epsilon.";
    const chunks = new RecursiveChunker(tokenizer).chunk(text, { maxTokens: 2 });
    const tokenChunks = chunks.filter((chunk) => chunk.metadata?.sourceType === "sentence-token");
    expect(tokenChunks.length).toBeGreaterThan(0);
    for (const chunk of tokenChunks) {
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.content);
    }
  });

  it.each([
    { newline: "\n", start: 18, end: 28 },
    { newline: "\r\n", start: 20, end: 30 },
  ])("rebases token fallback positions with $newline line endings", ({ newline, start, end }) => {
    const text = `A preamble.${newline}${newline}One. Two. alpha beta gamma delta epsilon.`;
    const chunks = new RecursiveChunker(whitespaceTokenizer).chunk(text, { maxTokens: 2 });
    expect(chunks.find((chunk) => chunk.content === "Two. alpha")).toMatchObject({
      start,
      end,
      metadata: {
        position: { start: { line: 3, column: 6 }, end: { line: 3, column: 16 } },
      },
    });
  });
});

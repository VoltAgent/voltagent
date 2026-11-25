import { describe, expect, it } from "vitest";
import { RecursiveChunker } from "../chunkers/recursive-chunker";
import { whitespaceTokenizer } from "../utils/tokenizer";

describe("RecursiveChunker", () => {
  it.each(["\n", "\r\n", "\r"])("splits blank lines with %j without changing offsets", (eol) => {
    const paragraphs = [
      `Refund requests are accepted.${eol}Include your order number.`,
      "Shipping times vary by destination.",
    ];
    const text = paragraphs.join(eol.repeat(2));
    const chunker = new RecursiveChunker(whitespaceTokenizer);
    const chunks = chunker.chunk(text, { maxTokens: 40 });

    expect(chunks.map((chunk) => chunk.content)).toEqual(paragraphs);
    for (const chunk of chunks) {
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.content);
    }
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

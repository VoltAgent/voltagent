import { describe, expect, it } from "vitest";
import { whitespaceTokenizer } from "../utils/tokenizer";
import { NeuralChunker } from "./neural-chunker";

describe("NeuralChunker output IDs", () => {
  it.each([
    { name: "default tokenizer", tokenizer: undefined },
    { name: "whitespace tokenizer", tokenizer: whitespaceTokenizer },
  ])("keeps IDs distinct after token expansion with $name", async ({ tokenizer }) => {
    for (const label of ["neural", "custom"]) {
      const chunks = await new NeuralChunker(tokenizer).chunk("a b c d e f", {
        detector: () => [1, 9],
        maxTokens: 2,
        label,
      });
      expect(chunks).toHaveLength(4);
      expect(chunks.map((chunk) => chunk.id)).toEqual([
        `${label}-0`,
        `${label}-1`,
        `${label}-2`,
        `${label}-3`,
      ]);
      expect(chunks.every((chunk) => (chunk.tokens ?? 0) <= 2)).toBe(true);
    }
  });
});

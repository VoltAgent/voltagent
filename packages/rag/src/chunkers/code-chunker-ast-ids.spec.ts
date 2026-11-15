import { describe, expect, it } from "vitest";
import { whitespaceTokenizer } from "../utils/tokenizer";
import { CodeChunker } from "./code-chunker";

describe("CodeChunker AST expansion", () => {
  it("assigns unique IDs when a split AST block precedes smaller blocks", () => {
    const blocks = ["one two three four five", "six", "seven"];
    const text = ["```txt", ...blocks, "```"].join("\n");
    const chunks = new CodeChunker(whitespaceTokenizer).chunk(text, {
      maxTokens: 2,
      parser: (source) =>
        blocks.map((block) => {
          const start = source.indexOf(block);
          return { kind: "function", start, end: start + block.length };
        }),
    });

    expect(chunks.map((chunk) => chunk.content)).toEqual([
      "one two",
      "three four",
      "five",
      "six",
      "seven",
    ]);
    expect(chunks.map((chunk) => chunk.id)).toEqual([
      "code-0",
      "code-1",
      "code-2",
      "code-3",
      "code-4",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { whitespaceTokenizer } from "../utils/tokenizer";
import { CodeChunker } from "./code-chunker";

describe("CodeChunker token fallback positions", () => {
  it.each([
    ["LF", "\n"],
    ["CRLF", "\r\n"],
  ])("locates split code in the original %s document", (_name, newline) => {
    const text = ["Introduction.", "", "```txt", "one two three four", "```", "After."].join(
      newline,
    );
    const chunks = new CodeChunker(whitespaceTokenizer)
      .chunk(text, { maxTokens: 2, parser: () => [] })
      .filter((chunk) => chunk.metadata?.type === "code");

    expect(chunks.map((chunk) => chunk.content)).toEqual(["one two", "three four"]);
    expect(chunks.map(({ start, end }) => text.slice(start, end))).toEqual([
      "one two",
      "three four",
    ]);
    expect(chunks.map((chunk) => chunk.metadata?.position)).toEqual([
      { start: { line: 4, column: 1 }, end: { line: 4, column: 8 } },
      { start: { line: 4, column: 9 }, end: { line: 4, column: 19 } },
    ]);
  });
});

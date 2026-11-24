import { describe, expect, it } from "vitest";
import type { Tokenizer } from "../types";
import { SlumberChunker } from "./slumber-chunker";

const tokenize: Tokenizer["tokenize"] = (text) =>
  Array.from(text.matchAll(/[a-z]+|\S/gi), (match) => ({
    value: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));

describe("SlumberChunker overlap", () => {
  it.each([" ", "  ", "\n", "\r\n"])("preserves the overlap source range after %j", (separator) => {
    const text = `First.${separator}red-blue.`;
    const chunks = new SlumberChunker().chunk(text, {
      maxTokens: 4,
      minTokens: 2,
      overlapTokens: 1,
      tokenizer: { tokenize, countTokens: (value) => tokenize(value).length },
    });
    const overlap = chunks.find((chunk) => chunk.label === "slumber-overlap");
    expect(overlap).toBeDefined();
    expect(overlap?.content).toBe("red");
    expect(overlap?.start).toBe(text.indexOf("red"));
    expect(overlap?.end).toBe(text.indexOf("red") + 3);
    expect(text.slice(overlap?.start, overlap?.end)).toBe(overlap?.content);
  });

  it("uses the configured tokenizer to select the overlap and its source range", () => {
    const text = "First.red-blue.";
    const chunks = new SlumberChunker().chunk(text, {
      maxTokens: 4,
      minTokens: 2,
      overlapTokens: 1,
      tokenizer: { tokenize, countTokens: (value) => tokenize(value).length },
    });

    expect(chunks.map(({ content }) => content)).toEqual(["First.", "red", "red-blue."]);
    expect(chunks[1]).toMatchObject({ start: 6, end: 9 });
  });
});

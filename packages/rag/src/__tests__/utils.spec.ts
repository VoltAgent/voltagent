import { describe, expect, it } from "vitest";
import { splitIntoParagraphs, splitIntoSentences } from "../utils/text";
import { createTikTokenizer, sliceByTokenRange, tokenizeWithPositions } from "../utils/tokenizer";
import { detectFormat } from "../utils/format-detector";

describe("Tokenizer utils", () => {
  it("tokenizes with positions and slices by range", () => {
    const text = "hello world";
    const tokens = tokenizeWithPositions(text);
    expect(tokens[0]).toMatchObject({ value: "hello", start: 0 });
    expect(tokens[1]).toMatchObject({ value: "world" });
    const slice = sliceByTokenRange(text, tokens, 0, 1);
    expect(slice).toBe("hello world");
  });
});

describe("Text utils", () => {
  it("splits into sentences with fallback for no punctuation", () => {
    const sentences = splitIntoSentences("No punctuation sentence");
    expect(sentences.length).toBe(1);
    expect(sentences[0]?.text).toContain("No punctuation");
  });

  it("splits into paragraphs by blank lines", () => {
    const paragraphs = splitIntoParagraphs("Para1\n\nPara2");
    expect(paragraphs.length).toBe(2);
  });
});

describe("createTikTokenizer", () => {
  it("creates tokenizer with tiktoken encoding", () => {
    const tokenizer = createTikTokenizer();
    expect(tokenizer.countTokens("hello")).toBeGreaterThan(0);
  });
});

describe("detectFormat", () => {
  it("detects JSON objects", () => {
    expect(detectFormat('{"id":1}')).toBe("json");
  });

  it("detects top-level JSON arrays", () => {
    expect(detectFormat('[{"id":1},{"id":2}]')).toBe("json");
  });

  it("falls back to text for incomplete JSON", () => {
    expect(detectFormat('[{"id":1}')).not.toBe("json");
  });
});

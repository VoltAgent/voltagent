import { describe, expect, it } from "vitest";
import { splitIntoParagraphs, splitIntoSentences } from "../utils/text";
import { createTikTokenizer, sliceByTokenRange, tokenizeWithPositions } from "../utils/tokenizer";

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
  it.each([
    [
      "Version 2.5 is out. It costs $3.99 today.",
      ["Version 2.5 is out.", " It costs $3.99 today."],
    ],
    ["2.5", ["2.5"]],
    ["2.5.", ["2.5."]],
    ["Version 1.2.3 is ready! Next?", ["Version 1.2.3 is ready!", " Next?"]],
    ["A -2.5 change. Another 0.25 change.", ["A -2.5 change.", " Another 0.25 change."]],
    ["  Price $3.99.\nNext 2.50?  ", ["  Price $3.99.", "\nNext 2.50?"]],
    ["foo.bar baz.qux end.", ["foo.", "bar baz.", "qux end."]],
    ["One.Two!Three?", ["One.", "Two!", "Three?"]],
    ["1. 2.", ["1.", " 2."]],
    ["1...2!", ["1...", "2!"]],
    ["word.2 ends.", ["word.", "2 ends."]],
    ["No punctuation", ["No punctuation"]],
    ["", []],
    ["   ", []],
  ])("preserves sentence boundaries in %j", (text, expected) => {
    const segments = splitIntoSentences(text);
    expect(segments.map((segment) => segment.text)).toEqual(expected);
    for (const segment of segments) {
      expect(text.slice(segment.start, segment.end)).toBe(segment.text);
      expect(segment.tokens).toBe(segment.text.trim().split(/\s+/).length);
    }
  });

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

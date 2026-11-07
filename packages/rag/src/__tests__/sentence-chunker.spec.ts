import { describe, expect, it } from "vitest";
import { SentenceChunker } from "../chunkers/sentence-chunker";
import { defaultTokenizer, whitespaceTokenizer } from "../utils/tokenizer";

describe("SentenceChunker", () => {
  it.each([
    {
      text: "One.Two. Three.",
      tokenizer: whitespaceTokenizer,
      expected: ["One.", "Two.", "Three."],
    },
    { text: "One.Two. Three.", tokenizer: defaultTokenizer, expected: ["One.", "Two.", "Three."] },
    { text: "你好。世界！", tokenizer: defaultTokenizer, expected: ["你好。世界！"] },
    { text: "😀.🧪. End.", tokenizer: defaultTokenizer, expected: ["😀.", "🧪.", "End."] },
  ])(
    "retains complete source sentences without invalid ranges: $text",
    ({ text, tokenizer, expected }) => {
      const chunks = new SentenceChunker(tokenizer).chunk(text, { maxTokens: 1 });
      expect(chunks.map((chunk) => chunk.content)).toEqual(expected);
      for (const chunk of chunks) {
        expect(chunk.start).toBeGreaterThanOrEqual(0);
        expect(chunk.end).toBeGreaterThan(chunk.start);
        expect(chunk.end).toBeLessThanOrEqual(text.length);
        expect(text.slice(chunk.start, chunk.end)).toBe(chunk.content);
      }
    },
  );

  it.each(["One. Two. Three. Four.", "One.\tTwo.\tThree.\tFour."])(
    "bounds the emitted tokens rather than preceding whitespace: %s",
    (text) => {
      const chunks = new SentenceChunker(whitespaceTokenizer).chunk(text, {
        maxTokens: 2,
        overlapSentences: 1,
      });
      expect(chunks.length).toBeGreaterThan(1);
      for (const chunk of chunks) {
        expect(text.slice(chunk.start, chunk.end)).toBe(chunk.content);
        expect(chunk.metadata?.position).toEqual({
          start: { line: 1, column: chunk.start + 1 },
          end: { line: 1, column: chunk.end + 1 },
        });
      }
    },
  );

  it("groups sentences under token budget", () => {
    const chunker = new SentenceChunker();
    const text =
      "First sentence is short. Second sentence is also short. This third one is a bit longer so it should force a new chunk.";
    const chunks = chunker.chunk(text, { maxTokens: 10 });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const allText = chunks.map((c) => c.content).join(" ");
    expect(allText).toContain("First sentence is short");
    expect(allText).toContain("Second sentence");
    expect(allText).toContain("This third one");
  });

  it("handles maxTokens of 1 by splitting every sentence", () => {
    const chunker = new SentenceChunker();
    const text = "A. B. C.";
    const chunks = chunker.chunk(text, { maxTokens: 1 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    expect(chunks.every((c) => (c.tokens ?? 0) <= 2)).toBe(true);
  });

  it("returns empty for whitespace-only input", () => {
    const chunker = new SentenceChunker();
    expect(chunker.chunk("   ", { maxTokens: 5 })).toEqual([]);
  });
});

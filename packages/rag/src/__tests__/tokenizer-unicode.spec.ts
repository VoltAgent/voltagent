import { describe, expect, it } from "vitest";
import { createTikTokenizer } from "../utils/tokenizer";

describe("tiktoken source spans", () => {
  it.each([
    [
      "a𠮷z",
      [
        [0, 1],
        [1, 3],
        [1, 3],
        [1, 3],
        [1, 3],
        [3, 4],
      ],
    ],
    [
      "A😀B",
      [
        [0, 1],
        [1, 3],
        [1, 3],
        [3, 4],
      ],
    ],
  ] as const)("maps split UTF-8 tokens in %j to complete source characters", (text, ranges) => {
    const tokenizer = createTikTokenizer({ encoding: "cl100k_base" });
    expect(tokenizer.tokenize(text).map(({ start, end }) => [start, end])).toEqual(ranges);
  });

  it.each(["gpt2", "r50k_base", "p50k_base", "p50k_edit", "cl100k_base", "o200k_base"] as const)(
    "preserves source positions with %s",
    (encoding) => {
      const tokenizer = createTikTokenizer({ encoding });
      for (const text of [
        "plain ASCII",
        "你好世界",
        "𠮷野家",
        "👩‍💻 works",
        "a\uFFFDz",
        "a\uD800z",
        "",
      ]) {
        const tokens = tokenizer.tokenize(text);
        expect(tokens).toHaveLength(tokenizer.countTokens(text));
        for (const token of tokens) {
          expect(token.start).toBeGreaterThanOrEqual(0);
          expect(token.end).toBeLessThanOrEqual(text.length);
          expect(token.end).toBeGreaterThan(token.start);
          expect(text.slice(token.start, token.end)).toBe(token.value);
          const startCode = text.charCodeAt(token.start);
          expect(startCode >= 0xdc00 && startCode <= 0xdfff).toBe(false);
        }
        expect(tokens.at(-1)?.end ?? 0).toBe(text.length);
      }
    },
  );
});

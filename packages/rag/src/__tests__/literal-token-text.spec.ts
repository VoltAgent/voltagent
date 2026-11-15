import { describe, expect, it } from "vitest";
import { TokenChunker, createTikTokenizer } from "../index";

describe("literal special-token spellings", () => {
  const tokenizer = createTikTokenizer();

  it.each([
    "ordinary research document",
    "Text about <|endoftext|>.",
    "Text about <|fim_prefix|>.",
  ])("counts and tokenizes ordinary document content: %s", (text) => {
    const tokens = tokenizer.tokenize(text);
    expect(tokens.map((token) => token.value).join("")).toBe(text);
    expect(tokenizer.countTokens(text)).toBe(tokens.length);
    expect(tokens.at(-1)?.end).toBe(text.length);
  });

  it.each([
    "ordinary research document",
    "Text about <|endoftext|>.",
    "Text about <|fim_prefix|>.",
  ])("preserves literal content through public chunking: %s", (text) => {
    const chunks = new TokenChunker().chunk(text, { maxTokens: 4 });
    expect(chunks.map((chunk) => chunk.content).join("")).toBe(text);
    for (const chunk of chunks) {
      expect(chunk.content).toBe(text.slice(chunk.start, chunk.end));
      expect(chunk.tokens).toBeLessThanOrEqual(4);
    }
  });

  it.each(["cl100k_base", "o200k_base"] as const)(
    "counts the spelling as multiple ordinary tokens with %s",
    (encoding) => {
      const tokenizer = createTikTokenizer({ encoding });
      expect(tokenizer.countTokens("<|endoftext|>")).toBe(7);
    },
  );
});

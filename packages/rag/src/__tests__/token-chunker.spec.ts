import { describe, expect, it } from "vitest";
import { TokenChunker } from "../chunkers/token-chunker";
import { createTikTokenizer } from "../utils/tokenizer";

describe("TokenChunker", () => {
  it.each(["😀", "𠮷"])("keeps %s whole without repeating it at zero overlap", (word) => {
    const tokenizer = createTikTokenizer({ encoding: "cl100k_base" });
    const text = `A${word}B`;
    const chunks = new TokenChunker(tokenizer).chunk(text, { maxTokens: 2, overlap: 0 });
    expect(chunks.map(({ content }) => content)).toEqual(["A", word, "B"]);
    expect(chunks.map(({ content }) => content).join("")).toBe(text);
    for (const chunk of chunks) {
      expect(chunk.tokens).toBe(tokenizer.countTokens(chunk.content));
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.content);
    }
    // A character larger than the budget is emitted alone, without dropping bytes.
    expect(chunks[1]?.tokens).toBe(tokenizer.countTokens(word));
  });

  it.each([1, 2])("rounds overlap %i down to complete source spans", (overlap) => {
    const tokenizer = createTikTokenizer({ encoding: "cl100k_base" });
    const text = "A😀B😀C";
    const chunks = new TokenChunker(tokenizer).chunk(text, { maxTokens: 3, overlap });
    expect(chunks.at(-1)?.end).toBe(text.length);
    for (const [index, chunk] of chunks.entries()) {
      expect(chunk.tokens).toBe(tokenizer.countTokens(chunk.content));
      expect(chunk.tokens).toBeLessThanOrEqual(3);
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.content);
      if (index === 0) continue;
      const previous = chunks[index - 1];
      expect(chunk.start).toBeGreaterThan(previous.start);
      expect(chunk.start).toBeLessThanOrEqual(previous.end);
      expect(tokenizer.countTokens(text.slice(chunk.start, previous.end))).toBeLessThanOrEqual(
        overlap,
      );
      expect(chunk.content).not.toContain("\uFFFD");
    }
  });

  it("splits text by token count with overlap", () => {
    const chunker = new TokenChunker();
    const text = "one two three four five six seven eight nine ten";
    const chunks = chunker.chunk(text, { maxTokens: 4, overlap: 1 });

    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.content.trim()).toBe("one two three four");
    expect(chunks[1]?.content.trim()).toBe("four five six seven");
    expect(chunks[2]?.content.trim()).toBe("seven eight nine ten");
  });

  it("returns empty array for empty input", () => {
    const chunker = new TokenChunker();
    expect(chunker.chunk("", { maxTokens: 3 })).toEqual([]);
  });

  it("clamps overlap and emits metadata positions", () => {
    const chunker = new TokenChunker();
    const chunks = chunker.chunk("a b c d", { maxTokens: 2, overlap: 5 });
    expect(chunks).toHaveLength(3);
    expect(chunks[0]?.metadata).toMatchObject({ tokenStart: 0, tokenEnd: 1 });
    expect(chunks[1]?.metadata).toMatchObject({ tokenStart: 1, tokenEnd: 2 });
  });
});

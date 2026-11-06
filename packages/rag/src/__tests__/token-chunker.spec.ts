import { describe, expect, it } from "vitest";
import { TokenChunker } from "../chunkers/token-chunker";
import { defaultTokenizer } from "../utils/tokenizer";

describe("TokenChunker", () => {
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

  it.each([
    ["Chinese", "自然语言处理是人工智能和语言学领域的分支学科。".repeat(20)],
    ["emoji", "😀🎉🚀✨🔥".repeat(40)],
  ])("keeps %s chunks to about maxTokens and whole characters", (_name, text) => {
    const chunker = new TokenChunker();
    const maxTokens = 30;
    const chunks = chunker.chunk(text, { maxTokens, overlap: 0 });

    expect(chunks.map((chunk) => chunk.content).join("")).toBe(text);
    for (const chunk of chunks) {
      expect(chunk.content).toBe(text.slice(chunk.start, chunk.end));
      expect(chunk.content).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
      expect(chunk.content).not.toMatch(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
      // A character that straddles a chunk boundary goes whole to one chunk, which can cost up to
      // two tokens more than that chunk's share when it is encoded again on its own
      expect(defaultTokenizer.countTokens(chunk.content)).toBeLessThanOrEqual(maxTokens + 2);
    }
  });
});

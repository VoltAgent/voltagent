import { describe, expect, it } from "vitest";
import { TokenChunker } from "../chunkers/token-chunker";

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
});

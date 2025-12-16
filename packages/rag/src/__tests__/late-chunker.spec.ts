import { describe, expect, it } from "vitest";
import { LateChunker } from "../chunkers/late-chunker";
import { TokenChunker } from "../chunkers/token-chunker";

describe("LateChunker", () => {
  it("merges base chunks into sliding windows", async () => {
    const base = {
      chunk: (input: string) => new TokenChunker().chunk(input, { maxTokens: 3, overlap: 0 }),
    } as unknown as TokenChunker;
    const text = "one two three four five six seven eight";
    const late = new LateChunker(base);

    const chunks = await late.chunk(text, { windowSize: 2, stride: 1 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.metadata?.mergedFrom?.length ?? 0).toBeGreaterThan(0);
    expect(chunks[0]?.content).toContain("one");
    expect(chunks[1]?.content).toContain("four");
  });

  it("respects stride when building windows", async () => {
    const base = new TokenChunker();
    const text = "a b c d e f";
    const late = new LateChunker(base);
    const chunks = await late.chunk(text, { windowSize: 2, stride: 2 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.metadata?.mergedFrom?.length ?? 0).toBeGreaterThan(0);
  });
});

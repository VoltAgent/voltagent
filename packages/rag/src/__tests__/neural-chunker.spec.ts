import { describe, expect, it } from "vitest";
import { NeuralChunker } from "../chunkers/neural-chunker";

describe("NeuralChunker", () => {
  it("uses detector boundaries and falls back to token chunking when needed", async () => {
    const detector = () => [20]; // split near 20th character
    const text =
      "This is a fairly long sentence that should be broken into two pieces by the detector.";

    const chunker = new NeuralChunker();
    const chunks = await chunker.chunk(text, { detector, maxTokens: 8 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.content.length).toBeGreaterThan(0);
    expect(chunks[0]?.id.startsWith("neural")).toBe(true);
  });

  it("throws when detector is missing", async () => {
    const chunker = new NeuralChunker();
    await expect(chunker.chunk("text")).rejects.toThrow();
  });

  it("deduplicates and sorts detector boundaries", async () => {
    const detector = () => [5, 5, 1, 50];
    const chunker = new NeuralChunker();
    const chunks = await chunker.chunk("abcdefg hijklmnop qrst", { detector, maxTokens: 100 });
    expect(chunks.length).toBeGreaterThan(1);
  });
});

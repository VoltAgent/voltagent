import { describe, expect, it } from "vitest";
import { SemanticChunker } from "../chunkers/semantic-chunker";

describe("SemanticChunker", () => {
  it("merges adjacent chunks when similarity threshold is met", async () => {
    const text =
      "Cats are great pets. Felines make wonderful companions. Quantum physics is unrelated to cats.";

    const embedder = {
      embed: (value: string) => {
        // Simple deterministic embedding: cat-related sentences share the same vector
        const isCat = value.toLowerCase().includes("cat") || value.toLowerCase().includes("feline");
        return isCat ? [1, 0] : [0, 1];
      },
    };

    const chunker = new SemanticChunker();
    const chunks = await chunker.chunk(text, { embedder, similarityThreshold: 0.7, maxTokens: 8 });

    expect(chunks.length).toBe(2);
    expect(chunks[0]?.content).toContain("Cats are great pets");
    expect(chunks[0]?.content).toContain("Felines make wonderful companions");
    expect(chunks[1]?.content).toContain("Quantum physics");
  });

  it("does not merge when similarity is below threshold", async () => {
    const text = "Cat sentence. Physics sentence.";
    const embedder = { embed: (value: string) => (value.includes("Cat") ? [1, 0] : [0, 1]) };
    const chunker = new SemanticChunker();
    const chunks = await chunker.chunk(text, { embedder, similarityThreshold: 0.95, maxTokens: 2 });
    expect(chunks.length).toBeGreaterThanOrEqual(2);
  });

  it("throws if embedder is missing", async () => {
    const chunker = new SemanticChunker();
    await expect(chunker.chunk("text")).rejects.toThrow();
  });
});

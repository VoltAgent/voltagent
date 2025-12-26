import { describe, expect, it } from "vitest";
import { SemanticMarkdownChunker } from "../chunkers/semantic-markdown-chunker";

describe("SemanticMarkdownChunker", () => {
  it("merges semantically similar markdown chunks", async () => {
    const md = `# Animals
Cats are great pets.
Felines are playful.

# Physics
Quantum mechanics is complex.`;

    const embedder = {
      embed: (value: string) =>
        value.toLowerCase().includes("cat") || value.toLowerCase().includes("feline")
          ? [1, 0]
          : [0, 1],
    };

    const chunker = new SemanticMarkdownChunker();
    const chunks = await chunker.chunk(md, { embedder, similarityThreshold: 0.7, maxTokens: 50 });
    const mergedText = chunks.map((c) => c.content).join(" ");
    expect(mergedText).toContain("Cats are great pets");
    expect(mergedText).toContain("Quantum mechanics");
    expect(chunks[0]?.metadata?.sourceType).toBe("semantic-markdown");
  });
});

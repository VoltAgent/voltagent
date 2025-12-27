import { describe, expect, it } from "vitest";
import { DocumentProcessor } from "./DocumentProcessor";
import type { EmbeddingModel } from "./embeddings/EmbeddingModel";
import { TextSplitter } from "./text-splitters/TextSplitter";

class MockSplitter extends TextSplitter {
  async splitText(text: string): Promise<string[]> {
    return text.split("|");
  }
}

class MockEmbedder implements EmbeddingModel {
  async embedQuery(_text: string): Promise<number[]> {
    return [0.1, 0.2];
  }
  async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map(() => [0.1, 0.2]);
  }
}

describe("DocumentProcessor", () => {
  it("processes text into documents with embeddings", async () => {
    const processor = new DocumentProcessor(new MockSplitter(), new MockEmbedder());
    const result = await processor.process("part1|part2", { file: "test.txt" });

    expect(result).toHaveLength(2);

    expect(result[0].text).toBe("part1");
    expect(result[0].embedding).toEqual([0.1, 0.2]);
    expect(result[0].metadata).toEqual({
      file: "test.txt",
      chunkIndex: 0,
      chunkCount: 2,
    });

    expect(result[1].text).toBe("part2");
    expect(result[1].embedding).toEqual([0.1, 0.2]);
    expect(result[1].metadata).toEqual({
      file: "test.txt",
      chunkIndex: 1,
      chunkCount: 2,
    });
  });
});

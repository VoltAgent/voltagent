import type { EmbedManyResult, EmbedResult, EmbeddingModel } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiSdkEmbeddingAdapter } from "./ai-sdk";

// Mock the AI SDK
vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: vi.fn(),
}));

describe("AiSdkEmbeddingAdapter", () => {
  let mockModel: EmbeddingModel;
  let adapter: AiSdkEmbeddingAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockModel = {
      modelId: "test-model",
      provider: "test-provider",
      doEmbed: vi.fn(),
    } as unknown as EmbeddingModel;

    adapter = new AiSdkEmbeddingAdapter(mockModel, {
      maxBatchSize: 2,
      normalize: false,
    });
  });

  describe("embed", () => {
    it("should embed a single text", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const { embed } = await import("ai");
      vi.mocked(embed).mockResolvedValue({
        value: "test text",
        embedding: mockEmbedding,
        usage: { tokens: 10 },
      } as EmbedResult<string>);

      const result = await adapter.embed("test text");

      expect(embed).toHaveBeenCalledWith({
        model: mockModel,
        value: "test text",
      });
      expect(result).toEqual(mockEmbedding);
    });

    it("should normalize vectors when option is enabled", async () => {
      const mockEmbedding = [3, 4, 0]; // magnitude = 5
      const { embed } = await import("ai");
      vi.mocked(embed).mockResolvedValue({
        value: "test text",
        embedding: mockEmbedding,
        usage: { tokens: 10 },
      } as EmbedResult<string>);

      const normalizedAdapter = new AiSdkEmbeddingAdapter(mockModel, {
        normalize: true,
      });

      const result = await normalizedAdapter.embed("test text");

      // Should be normalized to unit vector
      expect(result).toEqual([0.6, 0.8, 0]); // 3/5, 4/5, 0
    });

    it("should handle embedding errors", async () => {
      const { embed } = await import("ai");
      vi.mocked(embed).mockRejectedValue(new Error("API error"));

      await expect(adapter.embed("test text")).rejects.toThrow("Failed to embed text: API error");
    });
  });

  describe("embedBatch", () => {
    it("should embed multiple texts", async () => {
      const { embedMany } = await import("ai");
      vi.mocked(embedMany)
        .mockResolvedValueOnce({
          values: ["text1", "text2"],
          embeddings: [
            [0.1, 0.2],
            [0.3, 0.4],
          ],
          usage: { tokens: 20 },
        } as EmbedManyResult<string>)
        .mockResolvedValueOnce({
          values: ["text3"],
          embeddings: [[0.5, 0.6]],
          usage: { tokens: 10 },
        } as EmbedManyResult<string>);

      const result = await adapter.embedBatch(["text1", "text2", "text3"]);

      expect(embedMany).toHaveBeenCalledTimes(2); // maxBatchSize is 2
      expect(result).toEqual([
        [0.1, 0.2],
        [0.3, 0.4],
        [0.5, 0.6],
      ]);
    });

    it("should respect maxBatchSize", async () => {
      const { embedMany } = await import("ai");
      vi.mocked(embedMany)
        .mockResolvedValueOnce({
          values: ["text1", "text2"],
          embeddings: [
            [0.1, 0.2],
            [0.3, 0.4],
          ],
          usage: { tokens: 20 },
        } as EmbedManyResult<string>)
        .mockResolvedValueOnce({
          values: ["text3"],
          embeddings: [[0.5, 0.6]],
          usage: { tokens: 10 },
        } as EmbedManyResult<string>);

      const texts = ["text1", "text2", "text3"];
      const result = await adapter.embedBatch(texts);

      expect(embedMany).toHaveBeenCalledTimes(2);
      expect(embedMany).toHaveBeenNthCalledWith(1, {
        model: mockModel,
        values: ["text1", "text2"],
      });
      expect(embedMany).toHaveBeenNthCalledWith(2, {
        model: mockModel,
        values: ["text3"],
      });
      expect(result).toEqual([
        [0.1, 0.2],
        [0.3, 0.4],
        [0.5, 0.6],
      ]);
    });

    it("should return empty array for empty input", async () => {
      const result = await adapter.embedBatch([]);
      expect(result).toEqual([]);
    });

    it("should handle batch embedding errors", async () => {
      const { embedMany } = await import("ai");
      vi.mocked(embedMany).mockRejectedValue(new Error("Batch API error"));

      await expect(adapter.embedBatch(["text1", "text2"])).rejects.toThrow(
        "Failed to embed batch: Batch API error",
      );
    });
  });

  describe("getDimensions", () => {
    it("should return dimensions after first embedding", async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const { embed } = await import("ai");
      vi.mocked(embed).mockResolvedValue({
        value: "test text",
        embedding: mockEmbedding,
        usage: { tokens: 10 },
      } as EmbedResult<string>);

      await adapter.embed("test");

      expect(adapter.getDimensions()).toBe(3);
    });

    it("should return 0 if dimensions not yet known", () => {
      expect(adapter.getDimensions()).toBe(0);
    });
  });

  describe("getModelName", () => {
    it("should return the model ID", () => {
      expect(adapter.getModelName()).toBe("test-model");
    });
  });
});

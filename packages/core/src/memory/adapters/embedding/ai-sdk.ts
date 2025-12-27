import { type EmbeddingModel, embed, embedMany } from "ai";
import type { EmbeddingAdapter, EmbeddingOptions } from "./types";

/**
 * AI SDK Embedding Adapter
 * Wraps Vercel AI SDK embedding models for use with Memory V2
 */
export class AiSdkEmbeddingAdapter implements EmbeddingAdapter {
  private model: EmbeddingModel;
  private dimensions: number;
  private modelName: string;
  private options: EmbeddingOptions;

  constructor(model: EmbeddingModel, options: EmbeddingOptions = {}) {
    this.model = model;
    // EmbeddingModel can be either a string or an object with modelId
    this.modelName = typeof model === "string" ? model : model.modelId;
    this.dimensions = 0; // Will be set after first embedding
    this.options = {
      maxBatchSize: options.maxBatchSize ?? 100,
      timeout: options.timeout ?? 30000,
      normalize: options.normalize ?? false,
    };
  }

  async embed(text: string): Promise<number[]> {
    try {
      const result = await embed({
        model: this.model,
        value: text,
      });

      let embedding = result.embedding;

      // Set dimensions on first successful embedding
      if (this.dimensions === 0) {
        this.dimensions = embedding.length;
      }

      // Normalize if requested
      if (this.options.normalize) {
        embedding = this.normalizeVector(embedding);
      }

      return embedding;
    } catch (error) {
      throw new Error(
        `Failed to embed text: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const maxBatchSize = this.options.maxBatchSize ?? 100;
    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += maxBatchSize) {
      const batch = texts.slice(i, i + maxBatchSize);

      try {
        const result = await embedMany({
          model: this.model,
          values: batch,
        });

        let batchEmbeddings = result.embeddings;

        // Set dimensions on first successful embedding
        if (this.dimensions === 0 && batchEmbeddings.length > 0) {
          this.dimensions = batchEmbeddings[0].length;
        }

        // Normalize if requested
        if (this.options.normalize) {
          batchEmbeddings = batchEmbeddings.map((emb) => this.normalizeVector(emb));
        }

        embeddings.push(...batchEmbeddings);
      } catch (error) {
        throw new Error(
          `Failed to embed batch: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return embeddings;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModelName(): string {
    return this.modelName;
  }

  /**
   * Normalize a vector to unit length
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) {
      return vector;
    }
    return vector.map((val) => val / magnitude);
  }
}

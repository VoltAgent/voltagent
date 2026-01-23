import { embed, embedMany } from "ai";
import type { EmbeddingModel } from "ai";
import { ModelProviderRegistry } from "../../../registries/model-provider-registry";
import type { EmbeddingAdapter, EmbeddingModelReference, EmbeddingOptions } from "./types";

const BARE_MODEL_NAME_REGEX = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;

const isValidBareModelName = (value: string): boolean => BARE_MODEL_NAME_REGEX.test(value);

/**
 * AI SDK Embedding Adapter
 * Wraps Vercel AI SDK embedding models for use with Memory V2
 */
export class AiSdkEmbeddingAdapter implements EmbeddingAdapter {
  private model: EmbeddingModel;
  private dimensions: number;
  private modelName: string;
  private options: EmbeddingOptions;
  private modelResolvePromise?: Promise<EmbeddingModel>;

  constructor(model: EmbeddingModelReference, options: EmbeddingOptions = {}) {
    if (typeof model === "string") {
      const trimmed = model.trim();
      if (!trimmed) {
        throw new Error("Embedding model is required.");
      }
      this.model = trimmed;
      this.modelName = trimmed;
    } else {
      this.model = model;
      this.modelName = model.modelId;
    }
    this.dimensions = 0; // Will be set after first embedding
    this.options = {
      maxBatchSize: options.maxBatchSize ?? 100,
      timeout: options.timeout ?? 30000,
      normalize: options.normalize ?? false,
    };
  }

  private async resolveModel(): Promise<EmbeddingModel> {
    if (typeof this.model !== "string") {
      return this.model;
    }
    if (this.modelResolvePromise) {
      return this.modelResolvePromise;
    }

    const trimmed = this.model.trim();
    if (!trimmed) {
      throw new Error("Embedding model is required.");
    }

    const hasProviderPrefix = trimmed.includes("/") || trimmed.includes(":");
    if (!hasProviderPrefix) {
      if (!isValidBareModelName(trimmed)) {
        throw new Error(`Invalid embedding model id "${trimmed}".`);
      }
      this.model = trimmed;
      this.modelName = trimmed;
      return trimmed;
    }

    this.modelResolvePromise = ModelProviderRegistry.getInstance()
      .resolveEmbeddingModel(trimmed)
      .then((resolved) => {
        this.model = resolved;
        this.modelName = trimmed;
        return resolved;
      })
      .finally(() => {
        this.modelResolvePromise = undefined;
      });

    return this.modelResolvePromise;
  }

  async embed(text: string): Promise<number[]> {
    try {
      const model = await this.resolveModel();
      const result = await embed({
        model,
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

    const model = await this.resolveModel();
    const maxBatchSize = this.options.maxBatchSize ?? 100;
    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += maxBatchSize) {
      const batch = texts.slice(i, i + maxBatchSize);

      try {
        const result = await embedMany({
          model,
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

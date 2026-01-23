import type { EmbeddingModel } from "ai";
import type { EmbeddingRouterModelId } from "../../../registries/embedding-model-router-types";

type EmbeddingModelInstance = Exclude<EmbeddingModel, string>;

export type EmbeddingModelReference = EmbeddingRouterModelId | EmbeddingModelInstance;

/**
 * Embedding adapter interface for converting text to vectors
 */
export interface EmbeddingAdapter {
  /**
   * Embed a single text string into a vector
   */
  embed(text: string): Promise<number[]>;

  /**
   * Embed multiple texts in a batch for efficiency
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Get the dimensionality of the embeddings
   * Returns undefined if dimensions are not yet known
   */
  getDimensions(): number | undefined;

  /**
   * Get the model name for debugging/logging
   */
  getModelName(): string;
}

/**
 * Options for embedding adapter initialization
 */
export interface EmbeddingOptions {
  /**
   * Maximum number of texts to process in a single batch
   */
  maxBatchSize?: number;

  /**
   * Timeout for embedding operations in milliseconds
   */
  timeout?: number;

  /**
   * Whether to normalize embeddings to unit vectors
   */
  normalize?: boolean;
}

/**
 * Result from embedding operation with metadata
 */
export interface EmbeddingResult {
  /**
   * The embedding vector
   */
  embedding: number[];

  /**
   * Number of tokens in the input text
   */
  tokenCount?: number;

  /**
   * Time taken to generate embedding in ms
   */
  latency?: number;
}

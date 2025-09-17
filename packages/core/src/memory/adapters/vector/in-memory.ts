import { cosineSimilarity } from "../../utils/vector-math";
import type { SearchResult, VectorAdapter, VectorItem } from "./types";

/**
 * Lightweight in-memory vector database adapter
 * Suitable for development, testing, and small datasets (< 10k vectors)
 */
export class InMemoryVectorAdapter implements VectorAdapter {
  private vectors: Map<string, VectorItem>;
  private dimensions: number | null = null;

  constructor() {
    this.vectors = new Map();
  }

  async store(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void> {
    // Validate dimensions
    if (this.dimensions === null) {
      this.dimensions = vector.length;
    } else if (vector.length !== this.dimensions) {
      throw new Error(
        `Vector dimension mismatch. Expected ${this.dimensions}, got ${vector.length}`,
      );
    }

    this.vectors.set(id, {
      id,
      vector: [...vector], // Clone to prevent external modifications
      metadata: metadata ? { ...metadata } : undefined,
    });
  }

  async storeBatch(items: VectorItem[]): Promise<void> {
    for (const item of items) {
      await this.store(item.id, item.vector, item.metadata);
    }
  }

  async search(
    queryVector: number[],
    options?: {
      limit?: number;
      filter?: Record<string, unknown>;
      threshold?: number;
    },
  ): Promise<SearchResult[]> {
    const { limit = 10, threshold = 0, filter } = options || {};

    if (this.vectors.size === 0) {
      return [];
    }

    // Validate query vector dimensions
    if (this.dimensions !== null && queryVector.length !== this.dimensions) {
      throw new Error(
        `Query vector dimension mismatch. Expected ${this.dimensions}, got ${queryVector.length}`,
      );
    }

    const results: SearchResult[] = [];

    // Calculate similarities for all vectors
    for (const [, item] of this.vectors.entries()) {
      // Apply metadata filter if provided
      if (filter && !this.matchesFilter(item.metadata, filter)) {
        continue;
      }

      const similarity = cosineSimilarity(queryVector, item.vector);

      // Convert similarity to score (0-1 range where 1 is most similar)
      const score = (similarity + 1) / 2;

      if (score >= threshold) {
        results.push({
          ...item,
          score,
          distance: 1 - similarity, // Convert to distance metric
        });
      }
    }

    // Sort by score (descending) and limit results
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  async delete(id: string): Promise<void> {
    this.vectors.delete(id);
  }

  async deleteBatch(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.vectors.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.vectors.clear();
    this.dimensions = null;
  }

  async count(): Promise<number> {
    return this.vectors.size;
  }

  async get(id: string): Promise<VectorItem | null> {
    const item = this.vectors.get(id);
    if (!item) {
      return null;
    }

    // Return a copy to prevent external modifications
    return {
      ...item,
      vector: [...item.vector],
      metadata: item.metadata ? { ...item.metadata } : undefined,
    };
  }

  /**
   * Check if metadata matches the filter criteria
   */
  private matchesFilter(
    metadata: Record<string, unknown> | undefined,
    filter: Record<string, unknown>,
  ): boolean {
    if (!metadata) {
      return false;
    }

    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get statistics about the vector store
   */
  async getStats(): Promise<{
    count: number;
    dimensions: number | null;
    memoryUsage: number;
  }> {
    const count = this.vectors.size;
    let memoryUsage = 0;

    if (count > 0 && this.dimensions) {
      // Rough estimation: 4 bytes per float + overhead
      memoryUsage = count * this.dimensions * 4;
    }

    return {
      count,
      dimensions: this.dimensions,
      memoryUsage,
    };
  }
}

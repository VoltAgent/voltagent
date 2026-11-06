/**
 * Simple LRU cache for embeddings to avoid redundant API calls
 */
export class EmbeddingCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 1000, ttlMs = 3600000) {
    // 1 hour default TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttlMs;
  }

  /**
   * Get embedding from cache
   */
  get(text: string): number[] | null {
    const entry = this.cache.get(text);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(text);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(text);
    this.cache.set(text, entry);

    return entry.embedding;
  }

  /**
   * Store embedding in cache
   */
  set(text: string, embedding: number[]): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(text)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(text, {
      embedding: [...embedding], // Clone to prevent external modifications
      timestamp: Date.now(),
      text: text.substring(0, 100), // Store first 100 chars for debugging
    });
  }

  /**
   * Check if text is in cache
   */
  has(text: string): boolean {
    const cached = this.get(text);
    return cached !== null;
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    let validEntries = 0;
    const now = Date.now();

    for (const [, entry] of this.cache) {
      if (now - entry.timestamp <= this.ttl) {
        validEntries++;
      }
    }

    return {
      size: this.cache.size,
      validEntries,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
}

interface CacheEntry {
  embedding: number[];
  timestamp: number;
  text: string; // First 100 chars for debugging
}

interface CacheStats {
  size: number;
  validEntries: number;
  maxSize: number;
  ttl: number;
}

/**
 * Batch-aware embedding cache that can handle multiple texts at once
 */
export class BatchEmbeddingCache extends EmbeddingCache {
  /**
   * Get multiple embeddings from cache
   * Returns array where null indicates cache miss
   */
  getBatch(texts: string[]): (number[] | null)[] {
    return texts.map((text) => this.get(text));
  }

  /**
   * Store multiple embeddings in cache
   */
  setBatch(texts: string[], embeddings: number[][]): void {
    if (texts.length !== embeddings.length) {
      throw new Error("Texts and embeddings arrays must have same length");
    }

    for (let i = 0; i < texts.length; i++) {
      this.set(texts[i], embeddings[i]);
    }
  }

  /**
   * Split texts into cached and uncached
   */
  splitByCached(texts: string[]): {
    cached: { text: string; embedding: number[]; index: number }[];
    uncached: { text: string; index: number }[];
  } {
    const cached: { text: string; embedding: number[]; index: number }[] = [];
    const uncached: { text: string; index: number }[] = [];

    texts.forEach((text, index) => {
      const embedding = this.get(text);
      if (embedding) {
        cached.push({ text, embedding, index });
      } else {
        uncached.push({ text, index });
      }
    });

    return { cached, uncached };
  }
}

/**
 * Vector adapter interface for vector storage and similarity search
 */
export interface VectorAdapter {
  /**
   * Store a vector with associated metadata
   */
  store(id: string, vector: number[], metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Store multiple vectors in batch
   */
  storeBatch(items: VectorItem[]): Promise<void>;

  /**
   * Search for similar vectors using cosine similarity
   */
  search(vector: number[], options?: VectorSearchOptions): Promise<SearchResult[]>;

  /**
   * Delete a vector by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete multiple vectors by IDs
   */
  deleteBatch(ids: string[]): Promise<void>;

  /**
   * Clear all vectors
   */
  clear(): Promise<void>;

  /**
   * Get total count of stored vectors
   */
  count(): Promise<number>;

  /**
   * Get a specific vector by ID
   */
  get(id: string): Promise<VectorItem | null>;
}

/**
 * Item to store in vector database
 */
export interface VectorItem {
  /**
   * Unique identifier for the vector
   */
  id: string;

  /**
   * The embedding vector
   */
  vector: number[];

  /**
   * Optional metadata associated with the vector
   */
  metadata?: Record<string, unknown>;

  /**
   * Optional text content that was embedded
   */
  content?: string;
}

/**
 * Options for vector search
 */
export interface VectorSearchOptions {
  /**
   * Maximum number of results to return
   */
  limit?: number;

  /**
   * Minimum similarity threshold (0-1)
   */
  threshold?: number;

  /**
   * Filter results by metadata
   */
  filter?: Record<string, unknown>;
}

/**
 * Search result with similarity score
 */
export interface SearchResult extends VectorItem {
  /**
   * Similarity score (0-1, higher is more similar)
   */
  score: number;

  /**
   * Distance from query vector (lower is closer)
   */
  distance?: number;
}

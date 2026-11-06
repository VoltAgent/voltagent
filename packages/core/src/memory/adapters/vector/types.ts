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

  /**
   * Logical operators for complex metadata filtering ($and/$or)
   * @example { $and: [{ category: 'tech' }, { status: 'active' }] }
   */
  logicalFilter?:
    | Record<string, unknown>
    | { $and: Record<string, unknown>[] }
    | { $or: Record<string, unknown>[] };

  /**
   * Comparison operators for numeric/date metadata fields
   * @example { price: { $gt: 100 } }
   */
  comparisonFilter?: Record<string, unknown>;

  /**
   * Cursor for pagination (opaque string produced by {@link encodeCursor})
   *
   * When provided, the search is restricted to candidates whose primary key
   * (`id`) is strictly before the cursor's bound, allowing callers to page
   * through large result sets one bounded query at a time.
   */
  cursor?: string;
}

/**
 * Encode a vector ID into an opaque cursor value for cursor-based pagination.
 *
 * Cursors are keyset bounds on the row's primary key (`id`). Pass the encoded
 * value back into {@link VectorSearchOptions.cursor} on a subsequent search to
 * restrict the candidate set to rows strictly before the bound.
 */
export function encodeCursor(id: string): string {
  let hex = "";
  for (const char of id) {
    const code = char.codePointAt(0) ?? 0;
    const encoded = code.toString(16);
    hex += encoded.length < 4 ? `${"0".repeat(4 - encoded.length)}${encoded}` : encoded;
  }
  return hex;
}

/**
 * Decode an opaque cursor value produced by {@link encodeCursor} back into a
 * vector ID. Returns `undefined` when the value is not a valid cursor.
 */
export function decodeCursor(cursor: string): string | undefined {
  if (!cursor || cursor.length === 0 || cursor.length % 4 !== 0) {
    return undefined;
  }
  try {
    let id = "";
    for (let i = 0; i < cursor.length; i += 4) {
      id += String.fromCodePoint(Number.parseInt(cursor.slice(i, i + 4), 16));
    }
    return id;
  } catch {
    return undefined;
  }
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

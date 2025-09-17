/**
 * Vector math utilities for similarity calculations
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical direction,
 * 0 means perpendicular, and -1 means opposite direction
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vectors must have same length. Got ${a.length} and ${b.length}`);
  }

  if (a.length === 0) {
    throw new Error("Vectors cannot be empty");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0; // Handle zero vectors
  }

  return dotProduct / (normA * normB);
}

/**
 * Calculate Euclidean distance between two vectors
 * Lower values mean vectors are more similar
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vectors must have same length. Got ${a.length} and ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return vector; // Return original if zero vector
  }

  return vector.map((val) => val / magnitude);
}

/**
 * Calculate dot product of two vectors
 */
export function dotProduct(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vectors must have same length. Got ${a.length} and ${b.length}`);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }

  return sum;
}

/**
 * Calculate magnitude (length) of a vector
 */
export function magnitude(vector: number[]): number {
  return Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Convert cosine similarity to a normalized score (0-1)
 * where 1 is most similar and 0 is least similar
 */
export function similarityToScore(similarity: number): number {
  // Convert from [-1, 1] to [0, 1]
  return (similarity + 1) / 2;
}

/**
 * Batch cosine similarity calculation
 * Calculate similarity between a query vector and multiple target vectors
 */
export function batchCosineSimilarity(query: number[], targets: number[][]): number[] {
  return targets.map((target) => cosineSimilarity(query, target));
}

/**
 * Find top K most similar vectors from a list
 */
export function topKSimilar(
  query: number[],
  targets: { id: string; vector: number[] }[],
  k: number,
): { id: string; score: number }[] {
  const similarities = targets.map((target) => ({
    id: target.id,
    score: cosineSimilarity(query, target.vector),
  }));

  // Sort by similarity (descending) and take top K
  similarities.sort((a, b) => b.score - a.score);

  return similarities.slice(0, k);
}

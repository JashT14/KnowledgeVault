/**
 * Compute the L2 norm (magnitude) of a vector
 * @param vec - Input vector
 * @returns L2 norm value
 */
export function l2Norm(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

/**
 * Normalize a vector using L2 normalization
 * Returns a unit vector with magnitude 1
 * @param vec - Input vector
 * @returns Normalized vector
 */
export function l2Normalize(vec: number[]): number[] {
  const norm = l2Norm(vec);
  
  // Handle zero vector
  if (norm === 0) {
    return vec.map(() => 0);
  }
  
  return vec.map(v => v / norm);
}

/**
 * Normalize an embedding vector for semantic similarity
 * This is used before storing embeddings and computing similarities
 * @param embedding - Raw embedding vector
 * @returns Normalized embedding vector
 */
export function normalizeEmbedding(embedding: number[]): number[] {
  return l2Normalize(embedding);
}

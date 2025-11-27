/**
 * Compute the dot product of two vectors
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Dot product value
 */
export function dotProduct(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i];
  }
  return sum;
}

/**
 * Compute the magnitude (L2 norm) of a vector
 * @param vec - Input vector
 * @returns Magnitude value
 */
export function magnitude(vec: number[]): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

/**
 * Compute cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical direction
 * @param vecA - First vector
 * @param vecB - Second vector
 * @returns Cosine similarity value
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  const dot = dotProduct(vecA, vecB);
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);
  
  // Handle zero vectors
  if (magA === 0 || magB === 0) {
    return 0;
  }
  
  return dot / (magA * magB);
}

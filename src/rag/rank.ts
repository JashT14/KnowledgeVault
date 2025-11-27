import { RetrievalResult } from '../utils/types';
import { logDebug } from '../utils/logger';

/**
 * Sort notes by similarity score in descending order
 * @param results - Array of retrieval results
 * @returns Sorted array (highest similarity first)
 */
export function sortBySimilarity(results: RetrievalResult[]): RetrievalResult[] {
  return [...results].sort((a, b) => b.similarity - a.similarity);
}

/**
 * Get top-K results from retrieval
 * @param results - Array of retrieval results
 * @param k - Number of top results to return
 * @returns Top-K results sorted by similarity
 */
export function topK(results: RetrievalResult[], k: number): RetrievalResult[] {
  if (k <= 0) {
    logDebug('topK called with invalid k', { k });
    return [];
  }
  
  // Sort by similarity descending
  const sorted = sortBySimilarity(results);
  
  // Take top k
  const topResults = sorted.slice(0, k);
  
  logDebug('Top-K results', {
    requested: k,
    returned: topResults.length,
    topScore: topResults[0]?.similarity ?? 0,
  });
  
  return topResults;
}

/**
 * Get top-K results with minimum similarity threshold
 * @param results - Array of retrieval results
 * @param k - Maximum number of results
 * @param minSimilarity - Minimum similarity threshold
 * @returns Filtered and limited results
 */
export function topKWithThreshold(
  results: RetrievalResult[],
  k: number,
  minSimilarity: number = 0.3
): RetrievalResult[] {
  const sorted = sortBySimilarity(results);
  const filtered = sorted.filter(r => r.similarity >= minSimilarity);
  
  return filtered.slice(0, k);
}

/**
 * Calculate diversity score to promote diverse results
 * Higher score means more diverse from existing results
 * @param candidate - Candidate result
 * @param selected - Already selected results
 * @returns Diversity score
 */
function diversityScore(
  candidate: RetrievalResult,
  selected: RetrievalResult[]
): number {
  if (selected.length === 0) {
    return 1;
  }
  
  // Calculate minimum similarity to already selected items
  // Lower similarity = higher diversity
  let minSim = 1;
  for (const s of selected) {
    // Using text overlap as a simple diversity measure
    const overlap = textOverlap(candidate.note.text, s.note.text);
    minSim = Math.min(minSim, overlap);
  }
  
  return 1 - minSim;
}

/**
 * Simple text overlap calculation
 */
function textOverlap(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/));
  
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      intersection++;
    }
  }
  
  const union = wordsA.size + wordsB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Maximal Marginal Relevance (MMR) for diverse ranking
 * Balances relevance and diversity
 * @param results - Array of retrieval results
 * @param k - Number of results to return
 * @param lambda - Balance factor (1 = pure relevance, 0 = pure diversity)
 * @returns Diverse top-K results
 */
export function mmrRank(
  results: RetrievalResult[],
  k: number,
  lambda: number = 0.7
): RetrievalResult[] {
  if (results.length === 0 || k <= 0) {
    return [];
  }
  
  const sorted = sortBySimilarity(results);
  const selected: RetrievalResult[] = [];
  const remaining = [...sorted];
  
  while (selected.length < k && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevance = candidate.similarity;
      const diversity = diversityScore(candidate, selected);
      
      // MMR score = λ * relevance + (1-λ) * diversity
      const score = lambda * relevance + (1 - lambda) * diversity;
      
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    
    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }
  
  return selected;
}

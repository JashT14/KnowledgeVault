import { embedText } from '../embedding/embed';
import { getAllNotes } from '../db/notes';
import { cosineSimilarity } from '../utils/similarity';
import { Note, RetrievalResult } from '../utils/types';
import { logRetrievalTime, logDebug, createTimer } from '../utils/logger';

/**
 * Extract keywords from text (simple tokenization)
 * @param text - Input text
 * @returns Set of lowercase keywords
 */
function extractKeywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  );
}

/**
 * Calculate keyword overlap score between query and note
 * @param queryKeywords - Keywords from query
 * @param noteText - Note text to check
 * @returns Overlap score (0-1)
 */
function keywordOverlapScore(queryKeywords: Set<string>, noteText: string): number {
  const noteKeywords = extractKeywords(noteText);
  let matchCount = 0;
  
  for (const keyword of queryKeywords) {
    if (noteKeywords.has(keyword)) {
      matchCount++;
    }
  }
  
  return queryKeywords.size > 0 ? matchCount / queryKeywords.size : 0;
}

/**
 * Check if note contains at least one query keyword
 * @param queryKeywords - Keywords from query
 * @param noteText - Note text to check
 * @returns True if at least one keyword matches
 */
function hasKeywordMatch(queryKeywords: Set<string>, noteText: string): boolean {
  const noteLower = noteText.toLowerCase();
  for (const keyword of queryKeywords) {
    if (noteLower.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/**
 * Retrieve relevant notes using semantic similarity
 * @param query - User query text
 * @returns Array of notes with similarity scores
 */
export async function retrieveNotes(query: string): Promise<RetrievalResult[]> {
  const timer = createTimer('Retrieval');
  
  logDebug('Starting retrieval for query', { query: query.substring(0, 50) });
  
  // Embed user query using embed.ts
  const queryEmbedding = await embedText(query);
  
  // Load notes from SQLite
  const notes = await getAllNotes();
  
  if (notes.length === 0) {
    logDebug('No notes found in database');
    return [];
  }
  
  // Compute cosine similarity for each note
  const results: RetrievalResult[] = notes.map(note => {
    // Parse stored embeddings (already parsed in getAllNotes)
    const noteEmbedding = note.embedding;
    
    // Compute cosine similarity
    const similarity = cosineSimilarity(queryEmbedding, noteEmbedding);
    
    return {
      note,
      similarity,
    };
  });
  
  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);
  
  const elapsed = timer.stop();
  logRetrievalTime('Notes retrieved', Date.now() - elapsed, results.length);
  
  return results;
}

/**
 * Retrieve notes with hybrid scoring (semantic + keyword matching)
 * This provides more accurate results by combining embedding similarity
 * with actual keyword presence in the text
 * @param query - User query text
 * @param semanticWeight - Weight for semantic similarity (0-1), default 0.6
 * @returns Array of notes with combined scores
 */
export async function retrieveNotesHybrid(
  query: string,
  semanticWeight: number = 0.6
): Promise<RetrievalResult[]> {
  const timer = createTimer('Hybrid Retrieval');
  
  logDebug('Starting hybrid retrieval for query', { query: query.substring(0, 50) });
  
  // Extract query keywords for keyword matching
  const queryKeywords = extractKeywords(query);
  
  // Embed user query using embed.ts
  const queryEmbedding = await embedText(query);
  
  // Load notes from SQLite
  const notes = await getAllNotes();
  
  if (notes.length === 0) {
    logDebug('No notes found in database');
    return [];
  }
  
  const keywordWeight = 1 - semanticWeight;
  
  // Compute hybrid score for each note
  const results: RetrievalResult[] = notes.map(note => {
    const noteEmbedding = note.embedding;
    
    // Semantic similarity
    const semanticSim = cosineSimilarity(queryEmbedding, noteEmbedding);
    
    // Keyword overlap score
    const keywordScore = keywordOverlapScore(queryKeywords, note.text);
    
    // Combined hybrid score
    const hybridScore = (semanticWeight * semanticSim) + (keywordWeight * keywordScore);
    
    return {
      note,
      similarity: hybridScore,
    };
  });
  
  // Sort by hybrid score descending
  results.sort((a, b) => b.similarity - a.similarity);
  
  const elapsed = timer.stop();
  logRetrievalTime('Hybrid notes retrieved', Date.now() - elapsed, results.length);
  
  return results;
}

/**
 * Retrieve notes with minimum similarity threshold
 * @param query - User query text
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Filtered array of notes above threshold
 */
export async function retrieveNotesWithThreshold(
  query: string,
  minSimilarity: number = 0.3
): Promise<RetrievalResult[]> {
  const results = await retrieveNotes(query);
  
  const filtered = results.filter(r => r.similarity >= minSimilarity);
  
  logDebug('Filtered results by threshold', {
    threshold: minSimilarity,
    total: results.length,
    filtered: filtered.length,
  });
  
  return filtered;
}

/**
 * Retrieve notes with strict keyword filtering
 * Only returns notes that contain at least one query keyword
 * AND have similarity above threshold
 * @param query - User query text
 * @param minSimilarity - Minimum similarity threshold (0-1)
 * @returns Filtered array of notes that match keywords and threshold
 */
export async function retrieveNotesStrict(
  query: string,
  minSimilarity: number = 0.2
): Promise<RetrievalResult[]> {
  const timer = createTimer('Strict Retrieval');
  
  const queryKeywords = extractKeywords(query);
  
  // Use hybrid retrieval for better scoring
  const results = await retrieveNotesHybrid(query, 0.5);
  
  // Filter: must have at least one keyword match AND meet threshold
  const filtered = results.filter(r => {
    const hasKeyword = hasKeywordMatch(queryKeywords, r.note.text);
    const meetsThreshold = r.similarity >= minSimilarity;
    return hasKeyword && meetsThreshold;
  });
  
  timer.stop();
  
  logDebug('Strict filtered results', {
    threshold: minSimilarity,
    total: results.length,
    filtered: filtered.length,
    queryKeywords: Array.from(queryKeywords),
  });
  
  return filtered;
}

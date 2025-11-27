import { embedText } from '../embedding/embed';
import { getAllNotes } from '../db/notes';
import { cosineSimilarity } from '../utils/similarity';
import { Note, RetrievalResult } from '../utils/types';
import { logRetrievalTime, logDebug, createTimer } from '../utils/logger';

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

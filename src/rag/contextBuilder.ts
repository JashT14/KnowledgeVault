import { RetrievalResult, BuiltContext, Note } from '../utils/types';
import { topK } from './rank';
import { logDebug } from '../utils/logger';

function extractKeySentences(text: string, maxSentences: number = 3): string[] {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);
  
  if (sentences.length === 0) {
    return [text.trim()];
  }
  
  if (sentences.length <= maxSentences) {
    return sentences;
  }
  
  // Score sentences by importance indicators
  const scored = sentences.map((sentence, index) => {
    let score = 0;
    
    // First sentence bonus
    if (index === 0) score += 3;
    
    // Length bonus (prefer medium length)
    const words = sentence.split(/\s+/).length;
    if (words >= 5 && words <= 30) score += 2;
    
    // Key phrase indicators
    const keyPhrases = ['important', 'key', 'main', 'note', 'remember', 'summary'];
    for (const phrase of keyPhrases) {
      if (sentence.toLowerCase().includes(phrase)) {
        score += 1;
      }
    }
    
    // Capitalized words (potential proper nouns/concepts)
    const capitalizedWords = sentence.match(/[A-Z][a-z]+/g);
    if (capitalizedWords) {
      score += Math.min(capitalizedWords.length * 0.5, 2);
    }
    
    return { sentence, score, index };
  });
  
  // Sort by score descending, then by original order
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });
  
  // Take top sentences and restore original order
  const selected = scored
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map(s => s.sentence);
  
  return selected;
}

/**
 * Build combined context for RAG from retrieval results
 * @param results - Retrieval results (already sorted by similarity)
 * @param k - Number of top notes to use
 * @returns Built context with merged text and supporting notes
 */
export function buildContext(
  results: RetrievalResult[],
  k: number = 3
): BuiltContext {
  // Take top-k notes
  const topResults = topK(results, k);
  
  if (topResults.length === 0) {
    logDebug('No results to build context from');
    return {
      context: '',
      supportingNotes: [],
    };
  }
  
  logDebug('Building context', { numNotes: topResults.length });
  
  // Extract supporting notes
  const supportingNotes: Note[] = topResults.map(r => r.note);
  
  // Extract key sentences from each note
  const contextParts: string[] = [];
  
  for (let i = 0; i < topResults.length; i++) {
    const { note, similarity } = topResults[i];
    
    // Extract key sentences from this note
    const keySentences = extractKeySentences(note.text, 2);
    
    // Add with relevance indicator
    const relevanceLabel = similarity > 0.7 ? 'High' : 
                          similarity > 0.5 ? 'Medium' : 'Low';
    
    contextParts.push(
      `[Source ${i + 1} - ${relevanceLabel} relevance]\n${keySentences.join('. ')}.`
    );
  }
  
  // Merge into a context string
  const context = contextParts.join('\n\n');
  
  logDebug('Context built', { 
    length: context.length,
    numSources: supportingNotes.length 
  });
  
  return {
    context,
    supportingNotes,
  };
}

/**
 * Build a simple context without source labels
 * @param results - Retrieval results
 * @param k - Number of notes to include
 * @returns Plain context string
 */
export function buildSimpleContext(
  results: RetrievalResult[],
  k: number = 3
): string {
  const topResults = topK(results, k);
  
  const texts = topResults.map(r => {
    const sentences = extractKeySentences(r.note.text, 2);
    return sentences.join('. ') + '.';
  });
  
  return texts.join(' ');
}

/**
 * Build context with full note texts (no extraction)
 * @param results - Retrieval results
 * @param k - Number of notes to include
 * @param maxCharsPerNote - Maximum characters per note
 * @returns Full context with note texts
 */
export function buildFullContext(
  results: RetrievalResult[],
  k: number = 3,
  maxCharsPerNote: number = 500
): BuiltContext {
  const topResults = topK(results, k);
  const supportingNotes: Note[] = topResults.map(r => r.note);
  
  const contextParts = topResults.map((r, i) => {
    let text = r.note.text;
    if (text.length > maxCharsPerNote) {
      text = text.substring(0, maxCharsPerNote) + '...';
    }
    return `[Note ${i + 1}]\n${text}`;
  });
  
  return {
    context: contextParts.join('\n\n'),
    supportingNotes,
  };
}

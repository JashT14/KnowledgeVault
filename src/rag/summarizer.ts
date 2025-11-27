import { logDebug, createTimer } from '../utils/logger';

/**
 * Split text into sentences
 * @param text - Input text
 * @returns Array of sentences
 */
function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
  
  return sentences;
}

/**
 * Tokenize text into words (simple tokenization)
 * @param text - Input text
 * @returns Array of lowercase words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Compute term frequency for a document
 * @param words - Array of words
 * @returns Map of word to frequency
 */
function computeTF(words: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  
  for (const word of words) {
    tf.set(word, (tf.get(word) || 0) + 1);
  }
  
  // Normalize by document length
  const docLength = words.length;
  if (docLength > 0) {
    for (const [word, count] of tf) {
      tf.set(word, count / docLength);
    }
  }
  
  return tf;
}

/**
 * Compute inverse document frequency
 * @param sentences - Array of sentences
 * @returns Map of word to IDF score
 */
function computeIDF(sentences: string[]): Map<string, number> {
  const idf = new Map<string, number>();
  const docCount = sentences.length;
  
  // Count documents containing each word
  const wordDocCount = new Map<string, number>();
  
  for (const sentence of sentences) {
    const words = new Set(tokenize(sentence));
    for (const word of words) {
      wordDocCount.set(word, (wordDocCount.get(word) || 0) + 1);
    }
  }
  
  // Compute IDF: log(N / df)
  for (const [word, df] of wordDocCount) {
    idf.set(word, Math.log((docCount + 1) / (df + 1)) + 1);
  }
  
  return idf;
}

/**
 * Compute TF-IDF score for a sentence
 * @param sentence - Sentence to score
 * @param idf - IDF scores for all words
 * @returns TF-IDF score
 */
function computeSentenceScore(
  sentence: string,
  idf: Map<string, number>
): number {
  const words = tokenize(sentence);
  const tf = computeTF(words);
  
  let score = 0;
  for (const [word, tfVal] of tf) {
    const idfVal = idf.get(word) || 1;
    score += tfVal * idfVal;
  }
  
  // Normalize by sentence length to avoid bias toward longer sentences
  const lengthFactor = Math.sqrt(words.length);
  return lengthFactor > 0 ? score / lengthFactor : 0;
}

/**
 * Local extractive summarizer using TF-IDF
 * Selects most important sentences based on TF-IDF weights
 * @param text - Input text to summarize
 * @param numSentences - Number of sentences in summary
 * @returns Summary string
 */
export function summarize(text: string, numSentences: number = 3): string {
  const timer = createTimer('Summarization');
  
  // Split text into sentences
  const sentences = splitIntoSentences(text);
  
  if (sentences.length === 0) {
    return text.trim();
  }
  
  if (sentences.length <= numSentences) {
    return sentences.join(' ');
  }
  
  logDebug('Summarizing text', { 
    inputSentences: sentences.length,
    targetSentences: numSentences 
  });
  
  // Compute IDF weights across all sentences
  const idf = computeIDF(sentences);
  
  // Score each sentence using TF-IDF
  const scoredSentences = sentences.map((sentence, index) => ({
    sentence,
    score: computeSentenceScore(sentence, idf),
    index,
  }));
  
  // Sort by score descending
  scoredSentences.sort((a, b) => b.score - a.score);
  
  // Select top scoring sentences
  const selectedSentences = scoredSentences
    .slice(0, numSentences)
    // Restore original order for readability
    .sort((a, b) => a.index - b.index)
    .map(s => s.sentence);
  
  // Return summary string
  const summary = selectedSentences.join(' ');
  
  timer.stop();
  logDebug('Summary generated', { length: summary.length });
  
  return summary;
}

/**
 * Summarize with sentence position bias
 * Gives higher weight to sentences at the beginning
 * @param text - Input text
 * @param numSentences - Number of sentences
 * @returns Summary string
 */
export function summarizeWithPositionBias(
  text: string,
  numSentences: number = 3
): string {
  const sentences = splitIntoSentences(text);
  
  if (sentences.length <= numSentences) {
    return sentences.join(' ');
  }
  
  const idf = computeIDF(sentences);
  
  const scoredSentences = sentences.map((sentence, index) => {
    const tfidfScore = computeSentenceScore(sentence, idf);
    // Position bias: sentences earlier in text get bonus
    const positionBonus = 1 - (index / sentences.length) * 0.3;
    
    return {
      sentence,
      score: tfidfScore * positionBonus,
      index,
    };
  });
  
  scoredSentences.sort((a, b) => b.score - a.score);
  
  const selected = scoredSentences
    .slice(0, numSentences)
    .sort((a, b) => a.index - b.index)
    .map(s => s.sentence);
  
  return selected.join(' ');
}

/**
 * Get keywords from text based on TF-IDF
 * @param text - Input text
 * @param numKeywords - Number of keywords to extract
 * @returns Array of keywords
 */
export function extractKeywords(text: string, numKeywords: number = 5): string[] {
  const sentences = splitIntoSentences(text);
  const idf = computeIDF(sentences);
  
  // Get all words with their IDF scores
  const words = tokenize(text);
  const tf = computeTF(words);
  
  const wordScores: Array<{ word: string; score: number }> = [];
  
  for (const [word, tfVal] of tf) {
    const idfVal = idf.get(word) || 1;
    wordScores.push({ word, score: tfVal * idfVal });
  }
  
  // Sort by score and return top keywords
  wordScores.sort((a, b) => b.score - a.score);
  
  return wordScores.slice(0, numKeywords).map(w => w.word);
}

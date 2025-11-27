import { TokenizerOutput } from '../utils/types';
import { logDebug } from '../utils/logger';

import vocab from './vocab.json';

const CLS_TOKEN = '[CLS]';
const SEP_TOKEN = '[SEP]';
const UNK_TOKEN = '[UNK]';
const PAD_TOKEN = '[PAD]';

const MAX_LENGTH = 128;

function cleanText(text: string): string {
  let cleaned = text.toLowerCase();
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/[^\w\s.,!?'-]/g, ' ');
  return cleaned;
}

function wordPieceTokenize(word: string): string[] {
  const tokens: string[] = [];
  let start = 0;
  
  while (start < word.length) {
    let end = word.length;
    let foundToken: string | null = null;
    
    while (start < end) {
      let substr = word.substring(start, end);
      
      if (start > 0) {
        substr = '##' + substr;
      }
      
      if (substr in vocab) {
        foundToken = substr;
        break;
      }
      
      end--;
    }
    
    if (foundToken === null) {
      tokens.push(UNK_TOKEN);
      start++;
    } else {
      tokens.push(foundToken);
      start = end;
    }
  }
  
  return tokens;
}

/**
 * Convert text into token IDs for ONNX model
 * @param text - Input text to tokenize
 * @returns TokenizerOutput with input_ids and attention_mask
 */
export function tokenize(text: string): TokenizerOutput {
  logDebug('Tokenizing text', { length: text.length });
  
  // Clean the input text
  const cleanedText = cleanText(text);
  
  // Split into words
  const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
  
  // Tokenize each word using WordPiece
  const tokens: string[] = [CLS_TOKEN];
  
  for (const word of words) {
    const wordTokens = wordPieceTokenize(word);
    tokens.push(...wordTokens);
    
    // Check if we're approaching max length (leave room for SEP)
    if (tokens.length >= MAX_LENGTH - 1) {
      break;
    }
  }
  
  tokens.push(SEP_TOKEN);
  
  // Convert tokens to IDs
  const input_ids: number[] = tokens.map(token => {
    const id = (vocab as Record<string, number>)[token];
    return id !== undefined ? id : (vocab as Record<string, number>)[UNK_TOKEN];
  });
  
  // Create attention mask (1 for real tokens, 0 for padding)
  const attention_mask: number[] = new Array(input_ids.length).fill(1);
  
  // Pad to MAX_LENGTH
  const padId = (vocab as Record<string, number>)[PAD_TOKEN];
  while (input_ids.length < MAX_LENGTH) {
    input_ids.push(padId);
    attention_mask.push(0);
  }
  
  logDebug('Tokenization complete', { 
    numTokens: tokens.length,
    paddedLength: input_ids.length 
  });
  
  return { input_ids, attention_mask };
}

/**
 * Get vocabulary size
 * @returns Number of tokens in vocabulary
 */
export function getVocabSize(): number {
  return Object.keys(vocab).length;
}

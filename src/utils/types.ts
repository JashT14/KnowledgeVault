/**
 * Represents a note stored in the database
 */
export interface Note {
  /** Unique identifier for the note */
  id: number;
  /** The text content of the note */
  text: string;
  /** The embedding vector for semantic search */
  embedding: number[];
  /** Unix timestamp when the note was created */
  timestamp: number;
}

/**
 * Represents a retrieval result with similarity score
 */
export interface RetrievalResult {
  /** The retrieved note */
  note: Note;
  /** Cosine similarity score (0-1) */
  similarity: number;
}

/**
 * Represents the built context for RAG
 */
export interface BuiltContext {
  /** The merged context string */
  context: string;
  /** The supporting notes used to build the context */
  supportingNotes: Note[];
}

/**
 * Tokenizer output for ONNX model
 */
export interface TokenizerOutput {
  /** Token IDs */
  input_ids: number[];
  /** Attention mask */
  attention_mask: number[];
}

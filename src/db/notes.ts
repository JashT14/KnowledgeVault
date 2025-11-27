import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';
import { Note } from '../utils/types';
import { logDebug } from '../utils/logger';

// Enable promises for SQLite
SQLite.enablePromise(true);

let db: SQLiteDatabase | null = null;

/**
 * Initialize SQLite database and create tables
 */
export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabase({
      name: 'knowledge_vault.db',
      location: 'default',
    });
    
    // Create notes table from migrations.sql schema
    await db.executeSql(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        embedding TEXT NOT NULL,
        timestamp INTEGER
      );
    `);
    
    logDebug('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Ensure error has proper message for native bridge compatibility
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error initializing database');
    throw new Error(errorMessage || 'Failed to initialize database');
  }
}

/**
 * Get database instance, initializing if needed
 */
async function getDb(): Promise<SQLiteDatabase> {
  if (!db) {
    await initDatabase();
  }
  return db!;
}

/**
 * Save a new note with text and embedding
 * @param text - The note text content
 * @param embedding - The embedding vector as number array
 * @returns The inserted note ID
 */
export async function saveNote(text: string, embedding: number[]): Promise<number> {
  // Validate inputs to prevent null/undefined being passed to native bridge
  if (!text || typeof text !== 'string') {
    throw new Error('Note text is required and must be a string');
  }
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Embedding is required and must be a non-empty array');
  }

  try {
    const database = await getDb();
    const timestamp = Date.now();
    const embeddingJson = JSON.stringify(embedding);
    
    const [result] = await database.executeSql(
      'INSERT INTO notes (text, embedding, timestamp) VALUES (?, ?, ?)',
      [text, embeddingJson, timestamp]
    );
    
    const insertId = result.insertId;
    logDebug(`Note saved with ID: ${insertId}`);
    return insertId;
  } catch (error) {
    // Ensure error has proper message for native bridge compatibility
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error saving note');
    throw new Error(errorMessage || 'Failed to save note');
  }
}

/**
 * Get all notes from the database
 * @returns Array of all notes
 */
export async function getAllNotes(): Promise<Note[]> {
  try {
    const database = await getDb();
    
    const [results] = await database.executeSql(
      'SELECT * FROM notes ORDER BY timestamp DESC'
    );
    
    const notes: Note[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      notes.push({
        id: row.id,
        text: row.text,
        embedding: JSON.parse(row.embedding) as number[],
        timestamp: row.timestamp,
      });
    }
    
    return notes;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error fetching notes');
    throw new Error(errorMessage || 'Failed to get all notes');
  }
}

/**
 * Get a single note by ID
 * @param id - The note ID
 * @returns The note or null if not found
 */
export async function getNoteById(id: number): Promise<Note | null> {
  try {
    const database = await getDb();
    
    const [results] = await database.executeSql(
      'SELECT * FROM notes WHERE id = ?',
      [id]
    );
    
    if (results.rows.length === 0) {
      return null;
    }
    
    const row = results.rows.item(0);
    return {
      id: row.id,
      text: row.text,
      embedding: JSON.parse(row.embedding) as number[],
      timestamp: row.timestamp,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error fetching note');
    throw new Error(errorMessage || 'Failed to get note by ID');
  }
}

/**
 * Delete a note by ID
 * @param id - The note ID to delete
 * @returns True if deleted, false if not found
 */
export async function deleteNote(id: number): Promise<boolean> {
  try {
    const database = await getDb();
    
    const [result] = await database.executeSql(
      'DELETE FROM notes WHERE id = ?',
      [id]
    );
    
    const deleted = result.rowsAffected > 0;
    logDebug(`Note deleted: ${deleted}`);
    return deleted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error deleting note');
    throw new Error(errorMessage || 'Failed to delete note');
  }
}
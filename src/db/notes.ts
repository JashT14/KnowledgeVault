import * as SQLite from 'expo-sqlite';
import { Note } from '../utils/types';
import { logDebug } from '../utils/logger';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize SQLite database and create tables
 */
export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync('knowledge_vault.db');
    
    // Create notes table from migrations.sql schema
    await db.execAsync(`
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
    throw error;
  }
}

/**
 * Get database instance, initializing if needed
 */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
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
  const database = await getDb();
  const timestamp = Date.now();
  const embeddingJson = JSON.stringify(embedding);
  
  const result = await database.runAsync(
    'INSERT INTO notes (text, embedding, timestamp) VALUES (?, ?, ?)',
    [text, embeddingJson, timestamp]
  );
  
  logDebug(`Note saved with ID: ${result.lastInsertRowId}`);
  return result.lastInsertRowId;
}

/**
 * Get all notes from the database
 * @returns Array of all notes
 */
export async function getAllNotes(): Promise<Note[]> {
  const database = await getDb();
  
  const rows = await database.getAllAsync<{
    id: number;
    text: string;
    embedding: string;
    timestamp: number;
  }>('SELECT * FROM notes ORDER BY timestamp DESC');
  
  return rows.map(row => ({
    id: row.id,
    text: row.text,
    embedding: JSON.parse(row.embedding) as number[],
    timestamp: row.timestamp,
  }));
}

/**
 * Get a single note by ID
 * @param id - The note ID
 * @returns The note or null if not found
 */
export async function getNoteById(id: number): Promise<Note | null> {
  const database = await getDb();
  
  const row = await database.getFirstAsync<{
    id: number;
    text: string;
    embedding: string;
    timestamp: number;
  }>('SELECT * FROM notes WHERE id = ?', [id]);
  
  if (!row) {
    return null;
  }
  
  return {
    id: row.id,
    text: row.text,
    embedding: JSON.parse(row.embedding) as number[],
    timestamp: row.timestamp,
  };
}

/**
 * Delete a note by ID
 * @param id - The note ID to delete
 * @returns True if deleted, false if not found
 */
export async function deleteNote(id: number): Promise<boolean> {
  const database = await getDb();
  
  const result = await database.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  
  logDebug(`Note deleted: ${result.changes > 0}`);
  return result.changes > 0;
}

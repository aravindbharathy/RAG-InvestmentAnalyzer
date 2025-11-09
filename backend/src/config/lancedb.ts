import * as lancedb from '@lancedb/lancedb';
import { EMBEDDING_DIMENSIONS } from './openai';

// LanceDB connection and table setup
const dbPath = process.env.LANCEDB_PATH || './lancedb_data';

let db: lancedb.Connection | null = null;
let table: lancedb.Table | null = null;

export const LANCEDB_TABLE_NAME = 'investment_documents';

/**
 * Initialize LanceDB connection and table
 */
export async function initializeLanceDB() {
  try {
    console.log(`🔄 Initializing LanceDB at ${dbPath}...`);

    // Connect to LanceDB (creates directory if it doesn't exist)
    db = await lancedb.connect(dbPath);

    // Check if table exists
    const tableNames = await db.tableNames();

    if (tableNames.includes(LANCEDB_TABLE_NAME)) {
      // Open existing table
      table = await db.openTable(LANCEDB_TABLE_NAME);
      console.log(`✓ LanceDB table opened: ${LANCEDB_TABLE_NAME}`);
    } else {
      // Create table with initial empty data
      // LanceDB requires at least one record to create a table
      console.log(`📝 Creating new table: ${LANCEDB_TABLE_NAME}...`);

      // We'll create the table when we add the first chunk
      // For now, just log that it will be created on first use
      console.log(`✓ LanceDB ready. Table will be created on first document upload.`);
    }

    console.log('✓ LanceDB initialized successfully');
    return { db, table };
  } catch (error) {
    console.error('❌ Failed to initialize LanceDB:', error);
    throw error;
  }
}

/**
 * Get or create the LanceDB table
 */
export async function getTable(): Promise<lancedb.Table> {
  if (!db) {
    const result = await initializeLanceDB();
    db = result.db;
    table = result.table;
  }

  // If table still doesn't exist, return null and let the service handle creation
  return table as lancedb.Table;
}

/**
 * Get the database connection
 */
export function getConnection(): lancedb.Connection {
  if (!db) {
    throw new Error('LanceDB not initialized. Call initializeLanceDB() first.');
  }
  return db;
}

/**
 * Create table with schema (called when adding first chunk)
 */
export async function createTable(initialData: any[]): Promise<lancedb.Table> {
  if (!db) {
    const result = await initializeLanceDB();
    db = result.db;
  }

  table = await db.createTable(LANCEDB_TABLE_NAME, initialData);
  console.log(`✓ Created LanceDB table: ${LANCEDB_TABLE_NAME}`);
  return table;
}

export default { initializeLanceDB, getTable, getConnection, createTable };

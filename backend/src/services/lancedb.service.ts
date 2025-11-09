import { getTable, getConnection, createTable, LANCEDB_TABLE_NAME } from '../config/lancedb';
import * as lancedb from '@lancedb/lancedb';

/**
 * Add document chunks to LanceDB
 */
export async function addChunks(
  chunks: {
    id: string;
    text: string;
    embedding: number[];
    metadata: {
      documentId: string;
      companyId: string;
      companyTicker: string;
      documentType: string;
      chunkIndex: number;
      pageNumber?: number;
      section?: string;
    };
  }[]
): Promise<void> {
  try {
    // Format data for LanceDB (flatten structure)
    const data = chunks.map((c) => ({
      id: c.id,
      text: c.text,
      vector: c.embedding,
      documentId: c.metadata.documentId,
      companyId: c.metadata.companyId,
      companyTicker: c.metadata.companyTicker,
      documentType: c.metadata.documentType,
      chunkIndex: c.metadata.chunkIndex,
      pageNumber: c.metadata.pageNumber ?? null,
      section: c.metadata.section ?? null,
    }));

    let table = await getTable();

    if (!table) {
      // Create table with initial data
      table = await createTable(data);
      console.log(`✓ Created LanceDB table and added ${chunks.length} chunks`);
    } else {
      // Add to existing table
      await table.add(data);
      console.log(`✓ Added ${chunks.length} chunks to LanceDB`);
    }
  } catch (error) {
    console.error('Error adding chunks to LanceDB:', error);
    throw new Error('Failed to add chunks to LanceDB');
  }
}

/**
 * Search for similar chunks using vector similarity
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  options?: {
    limit?: number;
    companyFilter?: string;
    documentTypes?: string[];
  }
): Promise<{
  id: string;
  text: string;
  score: number;
  metadata: any;
}[]> {
  try {
    const table = await getTable();

    if (!table) {
      console.log('⚠️ LanceDB table not yet created. Returning empty results.');
      return [];
    }

    // Build query
    let query = table
      .vectorSearch(queryEmbedding)
      .limit(options?.limit ?? 5)
      .select(['id', 'text', 'documentId', 'companyId', 'companyTicker', 'documentType', 'chunkIndex', 'pageNumber', 'section']);

    // Add filters if provided
    if (options?.companyFilter) {
      query = query.where(`companyTicker = '${options.companyFilter}'`);
    }

    if (options?.documentTypes && options.documentTypes.length > 0) {
      const typeFilter = options.documentTypes.map((t) => `'${t}'`).join(', ');
      query = query.where(`documentType IN (${typeFilter})`);
    }

    // Execute query
    const results = await query.toArray();

    // Format results to match ChromaDB interface
    const formattedResults = results.map((result: any) => ({
      id: result.id,
      text: result.text,
      score: result._distance ?? 0, // LanceDB returns _distance
      metadata: {
        documentId: result.documentId,
        companyId: result.companyId,
        companyTicker: result.companyTicker,
        documentType: result.documentType,
        chunkIndex: result.chunkIndex,
        pageNumber: result.pageNumber,
        section: result.section,
      },
    }));

    return formattedResults;
  } catch (error) {
    console.error('Error searching LanceDB:', error);
    throw new Error('Failed to search LanceDB');
  }
}

/**
 * Delete chunks by document ID
 */
export async function deleteChunksByDocument(documentId: string): Promise<void> {
  try {
    const table = await getTable();

    if (!table) {
      console.log('⚠️ LanceDB table not yet created. Nothing to delete.');
      return;
    }

    // Delete rows where documentId matches
    await table.delete(`documentId = '${documentId}'`);

    console.log(`✓ Deleted chunks for document ${documentId} from LanceDB`);
  } catch (error) {
    console.error('Error deleting chunks from LanceDB:', error);
    throw new Error('Failed to delete chunks from LanceDB');
  }
}

/**
 * Get collection statistics
 */
export async function getCollectionStats(): Promise<{
  count: number;
  name: string;
}> {
  try {
    const table = await getTable();

    if (!table) {
      return {
        count: 0,
        name: LANCEDB_TABLE_NAME,
      };
    }

    const count = await table.countRows();

    return {
      count,
      name: LANCEDB_TABLE_NAME,
    };
  } catch (error) {
    console.error('Error getting LanceDB stats:', error);
    throw new Error('Failed to get LanceDB stats');
  }
}

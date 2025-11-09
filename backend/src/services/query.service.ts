import { prisma } from '../config/database';
import { generateEmbedding, generateAnswer, extractCitations } from './ai.service';
import { searchSimilarChunks } from './lancedb.service';
import { TOP_K_CHUNKS } from '../config/openai';

export interface QueryOptions {
  queryText: string;
  companyFilter?: string;
  documentTypes?: string[];
  limit?: number;
}

export interface QueryResponse {
  queryId: string;
  answer: string;
  citations: {
    id: string;
    documentId: string;
    documentName: string;
    companyTicker: string;
    excerptText: string;
    relevanceScore: number;
    citationIndex: number;
  }[];
  processingTimeMs: number;
  chunksRetrieved: number;
}

/**
 * Process a query and generate an answer
 */
export async function processQuery(options: QueryOptions): Promise<QueryResponse> {
  const startTime = Date.now();

  try {
    // Create query record
    const query = await prisma.query.create({
      data: {
        queryText: options.queryText,
        companyFilter: options.companyFilter,
        documentTypes: options.documentTypes || [],
      },
    });

    // Generate embedding for query
    const embeddingStart = Date.now();
    const queryEmbedding = await generateEmbedding(options.queryText);
    const embeddingTime = Date.now() - embeddingStart;

    // Search for similar chunks
    const searchStart = Date.now();
    const similarChunks = await searchSimilarChunks(queryEmbedding, {
      limit: options.limit ?? TOP_K_CHUNKS,
      companyFilter: options.companyFilter,
      documentTypes: options.documentTypes,
    });
    const searchTime = Date.now() - searchStart;

    if (similarChunks.length === 0) {
      throw new Error('No relevant documents found for this query');
    }

    // Get chunk details from PostgreSQL
    const chunkIds = similarChunks.map(c => c.id);
    const dbChunks = await prisma.documentChunk.findMany({
      where: {
        lanceId: { in: chunkIds },
      },
      include: {
        document: {
          include: {
            company: true,
          },
        },
      },
    });

    // Prepare context for LLM
    const context = similarChunks.map(sc => {
      const dbChunk = dbChunks.find(dc => dc.lanceId === sc.id);
      return dbChunk?.text || sc.text;
    });

    // Generate answer using Grok
    const llmStart = Date.now();
    const answer = await generateAnswer(options.queryText, context);
    const llmTime = Date.now() - llmStart;

    // Extract citations from answer
    const citationIndexes = extractCitations(answer);

    // Create result record
    const totalTime = Date.now() - startTime;
    const queryResult = await prisma.queryResult.create({
      data: {
        queryId: query.id,
        answer,
        processingTimeMs: totalTime,
        embeddingTimeMs: embeddingTime,
        searchTimeMs: searchTime,
        llmTimeMs: llmTime,
        chunksRetrieved: similarChunks.length,
      },
    });

    // Create citation records
    const citations = [];
    for (const citationIndex of citationIndexes) {
      const chunkIdx = citationIndex - 1; // Convert from 1-based to 0-based
      if (chunkIdx >= 0 && chunkIdx < similarChunks.length) {
        const similarChunk = similarChunks[chunkIdx];
        const dbChunk = dbChunks.find(dc => dc.lanceId === similarChunk.id);

        if (dbChunk) {
          const citation = await prisma.citation.create({
            data: {
              queryResultId: queryResult.id,
              documentId: dbChunk.documentId,
              chunkId: dbChunk.id,
              relevanceScore: similarChunk.score,
              citationIndex,
              excerptText: dbChunk.text.substring(0, 200) + '...',
            },
          });

          citations.push({
            id: citation.id,
            documentId: dbChunk.documentId,
            documentName: dbChunk.document.filename,
            companyTicker: dbChunk.document.company.ticker,
            excerptText: citation.excerptText,
            relevanceScore: similarChunk.score,
            citationIndex,
          });
        }
      }
    }

    return {
      queryId: query.id,
      answer,
      citations,
      processingTimeMs: totalTime,
      chunksRetrieved: similarChunks.length,
    };
  } catch (error) {
    console.error('Error processing query:', error);
    throw error;
  }
}

/**
 * Get query history
 */
export async function getQueryHistory(limit: number = 20) {
  const queries = await prisma.query.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      result: {
        include: {
          citations: {
            include: {
              document: {
                include: {
                  company: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return queries;
}

/**
 * Get specific query result
 */
export async function getQueryResult(queryId: string) {
  const query = await prisma.query.findUnique({
    where: { id: queryId },
    include: {
      result: {
        include: {
          citations: {
            include: {
              document: {
                include: {
                  company: true,
                },
              },
              chunk: true,
            },
          },
        },
      },
    },
  });

  if (!query) {
    throw new Error('Query not found');
  }

  return query;
}

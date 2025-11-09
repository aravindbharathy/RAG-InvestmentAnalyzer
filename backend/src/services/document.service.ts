import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { prisma } from '../config/database';
import { chunkTextBySentences } from '../utils/chunking';
import { generateEmbeddingsBatch } from './ai.service';
import { addChunks } from './lancedb.service';
import { DocumentStatus, DocumentType } from '@prisma/client';

/**
 * Extract text from PDF file
 */
export async function extractTextFromPDF(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    // @ts-ignore - pdf-parse has issues with TypeScript module resolution
    const pdfData = await pdfParse.default(dataBuffer);
    return pdfData.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from DOCX file
 */
export async function extractTextFromDOCX(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: dataBuffer });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Extract text from TXT file
 */
export async function extractTextFromTXT(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error('Error reading TXT file:', error);
    throw new Error('Failed to read TXT file');
  }
}

/**
 * Extract text based on file type
 */
export async function extractText(filePath: string, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(filePath);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return extractTextFromDOCX(filePath);
  } else if (mimeType === 'text/plain') {
    return extractTextFromTXT(filePath);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

/**
 * Process document: extract, chunk, embed, and store
 */
export async function processDocument(documentId: string): Promise<void> {
  try {
    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { company: true },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    console.log(`📄 Processing document: ${document.filename}`);

    // Update status to PROCESSING
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    });

    // Extract text
    const text = await extractText(document.fileUrl, document.mimeType);

    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from document');
    }

    console.log(`✓ Extracted ${text.length} characters`);

    // Chunk text
    const chunks = chunkTextBySentences(text, {
      chunkSize: 800,
      overlap: 100,
    });

    console.log(`✓ Created ${chunks.length} chunks`);

    // Generate embeddings (in batches of 50)
    const batchSize = 50;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await generateEmbeddingsBatch(batch.map(c => c.text));
      allEmbeddings.push(...embeddings);
      console.log(`✓ Generated embeddings for chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)}`);
    }

    // Store chunks in PostgreSQL and prepare for ChromaDB
    const chromaChunks = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = allEmbeddings[i];

      // Create chunk in PostgreSQL
      const dbChunk = await prisma.documentChunk.create({
        data: {
          documentId: document.id,
          text: chunk.text,
          chunkIndex: i,
          lanceId: `${documentId}_chunk_${i}`,
          tokenCount: chunk.tokenCount,
          embeddingStored: false,
        },
      });

      chromaChunks.push({
        id: dbChunk.lanceId,
        text: chunk.text,
        embedding,
        metadata: {
          documentId: document.id,
          companyId: document.companyId,
          companyTicker: document.company.ticker,
          documentType: document.documentType,
          chunkIndex: i,
        },
      });
    }

    // Store in ChromaDB
    await addChunks(chromaChunks);

    // Update chunks as embedded
    await prisma.documentChunk.updateMany({
      where: { documentId },
      data: { embeddingStored: true },
    });

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.COMPLETED,
        processingCompletedAt: new Date(),
        chunksCount: chunks.length,
      },
    });

    console.log(`✅ Document ${documentId} processed successfully`);
  } catch (error) {
    console.error(`Error processing document ${documentId}:`, error);

    // Update document with error
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.FAILED,
        processingError: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    throw error;
  }
}

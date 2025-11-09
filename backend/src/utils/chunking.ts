import { encoding_for_model } from 'tiktoken';
import { CHUNK_SIZE, CHUNK_OVERLAP } from '../config/openai';

const encoder = encoding_for_model('gpt-4o');

/**
 * Count tokens in text
 */
export function countTokens(text: string): number {
  return encoder.encode(text).length;
}

/**
 * Split text into chunks based on token count
 */
export function chunkText(
  text: string,
  options?: {
    chunkSize?: number;
    overlap?: number;
  }
): { text: string; tokenCount: number }[] {
  const chunkSize = options?.chunkSize ?? CHUNK_SIZE;
  const overlap = options?.overlap ?? CHUNK_OVERLAP;

  const tokens = encoder.encode(text);
  const chunks: { text: string; tokenCount: number }[] = [];

  let startIdx = 0;

  while (startIdx < tokens.length) {
    // Get chunk of tokens
    const endIdx = Math.min(startIdx + chunkSize, tokens.length);
    const chunkTokens = tokens.slice(startIdx, endIdx);

    // Decode back to text
    const chunkText = new TextDecoder().decode(encoder.decode(chunkTokens));

    chunks.push({
      text: chunkText.trim(),
      tokenCount: chunkTokens.length,
    });

    // Move start position (with overlap)
    startIdx += chunkSize - overlap;

    // Break if we're at the end
    if (endIdx === tokens.length) break;
  }

  return chunks;
}

/**
 * Split text by sentences with token limit
 * Better chunking that tries to preserve sentence boundaries
 */
export function chunkTextBySentences(
  text: string,
  options?: {
    chunkSize?: number;
    overlap?: number;
  }
): { text: string; tokenCount: number }[] {
  const chunkSize = options?.chunkSize ?? CHUNK_SIZE;
  const overlap = options?.overlap ?? CHUNK_OVERLAP;

  // Split into sentences (basic splitting)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  const chunks: { text: string; tokenCount: number }[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence);

    // If adding this sentence exceeds chunk size, save current chunk
    if (currentTokenCount + sentenceTokens > chunkSize && currentChunk.length > 0) {
      const chunkText = currentChunk.join(' ').trim();
      chunks.push({
        text: chunkText,
        tokenCount: countTokens(chunkText),
      });

      // Start new chunk with overlap
      // Keep last few sentences for overlap
      const overlapText = currentChunk.slice(-3).join(' ');
      const overlapTokens = countTokens(overlapText);
      
      if (overlapTokens < overlap) {
        currentChunk = currentChunk.slice(-3);
        currentTokenCount = overlapTokens;
      } else {
        currentChunk = [];
        currentTokenCount = 0;
      }
    }

    currentChunk.push(sentence);
    currentTokenCount += sentenceTokens;
  }

  // Add final chunk
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join(' ').trim();
    chunks.push({
      text: chunkText,
      tokenCount: countTokens(chunkText),
    });
  }

  return chunks;
}

/**
 * Clean up encoding resources
 */
export function cleanupEncoder(): void {
  encoder.free();
}

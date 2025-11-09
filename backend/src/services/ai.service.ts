import { grokClient, embeddingClient, CHAT_MODEL, EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from '../config/openai';

/**
 * Generate embeddings for text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await embeddingClient.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const response = await embeddingClient.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings batch:', error);
    throw new Error('Failed to generate embeddings batch');
  }
}

/**
 * Generate answer using Grok LLM
 */
export async function generateAnswer(
  query: string,
  context: string[],
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  try {
    const systemPrompt = `You are a financial analyst assistant helping investment managers analyze documents.

Your task is to answer questions based ONLY on the provided context from financial documents.

Instructions:
1. Answer the question accurately using only information from the context
2. Include specific citations using [1], [2], etc. to reference the context chunks
3. If the context doesn't contain enough information, say so clearly
4. Be concise but thorough
5. Use financial terminology appropriately
6. Highlight key metrics, trends, and insights`;

    const contextText = context
      .map((chunk, idx) => `[${idx + 1}] ${chunk}`)
      .join('\n\n');

    const userPrompt = `Context from documents:
${contextText}

Question: ${query}

Answer:`;

    const response = await grokClient.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1000,
    });

    return response.choices[0]?.message?.content || 'No answer generated';
  } catch (error) {
    console.error('Error generating answer with Grok:', error);
    throw new Error('Failed to generate answer');
  }
}

/**
 * Extract citations from generated answer
 */
export function extractCitations(answer: string): number[] {
  const citationPattern = /\[(\d+)\]/g;
  const citations = new Set<number>();
  
  let match;
  while ((match = citationPattern.exec(answer)) !== null) {
    citations.add(parseInt(match[1], 10));
  }
  
  return Array.from(citations).sort((a, b) => a - b);
}

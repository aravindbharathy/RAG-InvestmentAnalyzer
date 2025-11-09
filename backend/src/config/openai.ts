import OpenAI from 'openai';

// Grok (xAI) Configuration
const grokApiKey = process.env.GROK_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!grokApiKey || grokApiKey === 'xai-your-key-here') {
  console.warn('⚠️  GROK_API_KEY not set. Please add your xAI API key to .env');
}

// Grok client for LLM (chat completions)
export const grokClient = new OpenAI({
  apiKey: grokApiKey,
  baseURL: 'https://api.x.ai/v1',
});

// OpenAI client for embeddings (Grok doesn't support embeddings yet)
// You can also use other embedding providers like Cohere, Voyage AI, etc.
export const embeddingClient = new OpenAI({
  apiKey: openaiApiKey,
});

// Model configurations
export const CHAT_MODEL = 'grok-beta'; // xAI's Grok model
export const CHAT_MODEL_FALLBACK = 'grok-beta';

// Embeddings (using OpenAI for now since Grok doesn't support it)
export const EMBEDDING_MODEL = 'text-embedding-3-large';
export const EMBEDDING_DIMENSIONS = 1536;

// Chunk configuration
export const CHUNK_SIZE = 800; // tokens
export const CHUNK_OVERLAP = 100; // tokens

// Retrieval configuration
export const TOP_K_CHUNKS = 5; // Number of chunks to retrieve for each query

// Export Grok as default for chat
export default grokClient;

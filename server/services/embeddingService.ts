import { GoogleGenerativeAI } from '@google/generative-ai';

// Use 768 dimensions for faster, cheaper embeddings
const EMBEDDING_DIMENSION = 768;

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Generates embeddings for an array of text chunks using Gemini API
 * @param texts - Array of text strings to embed
 * @returns Array of embedding vectors (768-dimensional)
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  // Process texts in batches to avoid rate limits
  const batchSize = 5;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    console.log(`Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (${batch.length} texts)`);

    for (const text of batch) {
      try {
        const embedding = await embedSingleText(text);
        embeddings.push(embedding);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error('Error embedding text:', error);
        throw error;
      }
    }
  }

  return embeddings;
}

/**
 * Generates embedding for a single text using Gemini API
 * @param text - Text string to embed
 * @returns Embedding vector (768-dimensional)
 */
export async function embedSingleText(text: string): Promise<number[]> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: 'text-embedding-004'
  });

  const result = await model.embedContent(text);

  return result.embedding.values;
}

/**
 * Gets the embedding dimension used by this service
 */
export function getEmbeddingDimension(): number {
  return EMBEDDING_DIMENSION;
}

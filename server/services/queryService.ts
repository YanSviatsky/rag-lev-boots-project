import { GoogleGenerativeAI } from '@google/generative-ai';
import sequelize from '../config/database';

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

export interface SimilarChunk {
  id: number;
  source: string;
  source_id: string;
  chunk_index: number;
  chunk_content: string;
  distance: number;
}

/**
 * Searches for similar chunks using vector cosine similarity
 * @param questionEmbedding - The embedding vector of the user's question
 * @param topK - Number of top results to return (default: 5)
 * @returns Array of similar chunks with distance scores
 */
export async function searchSimilarChunks(
  questionEmbedding: number[],
  topK: number = 5
): Promise<SimilarChunk[]> {
  // Convert embedding array to pgvector format string
  const embeddingString = `[${questionEmbedding.join(',')}]`;

  const query = `
    SELECT
      id,
      source,
      source_id,
      chunk_index,
      chunk_content,
      (embeddings_768 <=> $1::vector) as distance
    FROM knowledge_base
    WHERE embeddings_768 IS NOT NULL
    ORDER BY distance
    LIMIT $2
  `;

  const result = await sequelize.query(query, {
    bind: [embeddingString, topK],
    type: sequelize.QueryTypes.SELECT,
  });

  return result as SimilarChunk[];
}

/**
 * Generates an answer using Gemini LLM based on retrieved context
 * @param question - The user's question
 * @param contextChunks - Array of relevant text chunks
 * @returns The generated answer
 */
export async function generateAnswer(
  question: string,
  contextChunks: string[]
): Promise<string> {
  const ai = getGenAI();

  // Use Gemini 2.0 Flash for fast responses
  const model = ai.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
  });

  // Construct the prompt with context
  const context = contextChunks.join('\n\n---\n\n');

  const prompt = `You are an assistant answering questions about Lev-Boots technology.

Context information:
${context}

Question: ${question}

Answer the question based ONLY on the context provided above. If the answer is not in the context, say "I don't have enough information to answer that question."

Answer:`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3, // Lower temperature for more consistent answers
      maxOutputTokens: 500,
    },
  });

  const response = result.response;
  const answer = response.text();

  return answer.trim();
}

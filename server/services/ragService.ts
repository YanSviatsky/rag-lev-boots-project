import { loadAllSources } from './dataLoaders';
import { chunkText } from './textProcessor';
import { embedTexts, embedSingleText } from './embeddingService';
import { searchSimilarChunks, generateAnswer } from './queryService';
import { KnowledgeBase } from '../models/index';

/**
 * Loads all data from PDFs, articles, and Slack messages
 * Chunks the content, embeds it, and stores in the database
 */
export const loadAllData = async () => {
  try {
    console.log('Starting data loading process...\n');

    // Check if data already exists
    const existingCount = await KnowledgeBase.count();
    if (existingCount > 0) {
      console.log(`⚠️  Database already contains ${existingCount} records.`);
      console.log('Skipping data load to avoid duplicates.\n');
      return;
    }

    // Step 1: Load all documents from all sources
    const documents = await loadAllSources();

    // Step 2: Chunk and prepare data
    console.log('=== Chunking documents ===\n');
    const allChunks: Array<{
      source: string;
      source_id: string;
      chunk_index: number;
      chunk_content: string;
    }> = [];

    for (const doc of documents) {
      const chunks = chunkText(doc.content, 400);
      console.log(`  ✓ ${doc.source_id}: ${chunks.length} chunks`);

      for (const chunk of chunks) {
        allChunks.push({
          source: doc.source,
          source_id: doc.source_id,
          chunk_index: chunk.chunk_index,
          chunk_content: chunk.chunk_content,
        });
      }
    }

    console.log(`\n=== Total chunks to embed: ${allChunks.length} ===\n`);

    // Step 3: Embed all chunks
    console.log('=== Embedding chunks ===\n');
    const chunkTexts = allChunks.map(c => c.chunk_content);
    const embeddings = await embedTexts(chunkTexts);

    console.log(`\n✓ Successfully embedded ${embeddings.length} chunks\n`);

    // Step 4: Prepare database records
    const records = allChunks.map((chunk, index) => ({
      source: chunk.source,
      source_id: chunk.source_id,
      chunk_index: chunk.chunk_index,
      chunk_content: chunk.chunk_content,
      embeddings_768: embeddings[index],
      embeddings_1536: null,
    }));

    // Step 5: Bulk insert into database
    console.log('=== Storing in database ===\n');
    await KnowledgeBase.bulkCreate(records);

    console.log(`✓ Successfully stored ${records.length} records in database\n`);
    console.log('=== Data loading complete! ===\n');

  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
};

/**
 * Answers a user's question using RAG (Retrieval-Augmented Generation)
 * @param userQuestion - The user's question
 * @returns The generated answer based on retrieved context
 */
export const ask = async (userQuestion: string): Promise<string> => {
  try {
    console.log(`\n=== Processing question: "${userQuestion}" ===\n`);

    // Step 1: Embed the user's question
    console.log('Step 1: Embedding question...');
    const questionEmbedding = await embedSingleText(userQuestion);
    console.log('✓ Question embedded\n');

    // Step 2: Search for similar chunks in the knowledge base
    console.log('Step 2: Searching for similar chunks...');
    const similarChunks = await searchSimilarChunks(questionEmbedding, 5);
    console.log(`✓ Found ${similarChunks.length} similar chunks\n`);

    // Step 3: Extract context from retrieved chunks
    const contextChunks = similarChunks.map(chunk => chunk.chunk_content);

    // Step 4: Generate answer using LLM
    console.log('Step 3: Generating answer...');
    const answer = await generateAnswer(userQuestion, contextChunks);
    console.log('✓ Answer generated\n');

    return answer;
  } catch (error) {
    console.error('Error in ask():', error);
    throw error;
  }
};

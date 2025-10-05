export interface ChunkedText {
  chunk_index: number;
  chunk_content: string;
}

/**
 * Splits text into chunks of approximately the specified number of words
 * @param text - The text to chunk
 * @param wordsPerChunk - Target number of words per chunk (default: 400)
 * @returns Array of chunks with index and content
 */
export function chunkText(text: string, wordsPerChunk: number = 400): ChunkedText[] {
  // Clean and normalize the text
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  if (!normalizedText) {
    return [];
  }

  // Split into words
  const words = normalizedText.split(' ');
  const chunks: ChunkedText[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    const chunkWords = words.slice(i, i + wordsPerChunk);
    chunks.push({
      chunk_index: Math.floor(i / wordsPerChunk),
      chunk_content: chunkWords.join(' '),
    });
  }

  return chunks;
}

/**
 * Counts the number of words in a text string
 * @param text - The text to count words in
 * @returns Number of words
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

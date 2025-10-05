import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LoadedDocument {
  source: string;
  source_id: string;
  content: string;
}

export interface SlackMessage {
  id: string;
  channel: string;
  user: string;
  role: string;
  ts: string;
  text: string;
  thread_ts: string;
}

interface SlackResponse {
  channel: string;
  page: number;
  limit: number;
  total: number;
  items: SlackMessage[];
}

/**
 * Loads all PDFs from the knowledge_pdfs directory
 */
export async function loadPDFs(): Promise<LoadedDocument[]> {
  const pdfDir = path.join(__dirname, '../knowledge_pdfs');
  const pdfFiles = [
    'OpEd - A Revolution at Our Feet.pdf',
    'Research Paper - Gravitational Reversal Physics.pdf',
    'White Paper - The Development of Localized Gravity Reversal Technology.pdf',
  ];

  const documents: LoadedDocument[] = [];

  for (const filename of pdfFiles) {
    const filePath = path.join(pdfDir, filename);
    console.log(`Loading PDF: ${filename}`);

    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      documents.push({
        source: 'pdf',
        source_id: filename,
        content: data.text,
      });

      console.log(`  ✓ Loaded ${filename} (${data.text.length} characters)`);
    } catch (error) {
      console.error(`  ✗ Error loading ${filename}:`, error);
      throw error;
    }
  }

  return documents;
}

/**
 * Loads all articles from the GitHub Gist URLs
 */
export async function loadArticles(): Promise<LoadedDocument[]> {
  const articles = [
    { num: 1, id: 'military-deployment-report' },
    { num: 2, id: 'urban-commuting' },
    { num: 3, id: 'hover-polo' },
    { num: 4, id: 'warehousing' },
    { num: 5, id: 'consumer-safety' },
  ];

  const documents: LoadedDocument[] = [];

  for (const article of articles) {
    const url = `https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-${article.num}_${article.id}.md`;
    console.log(`Loading article: ${article.id}`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const content = await response.text();

      documents.push({
        source: 'article',
        source_id: article.id,
        content,
      });

      console.log(`  ✓ Loaded ${article.id} (${content.length} characters)`);
    } catch (error) {
      console.error(`  ✗ Error loading ${article.id}:`, error);
      throw error;
    }
  }

  return documents;
}

/**
 * Loads all messages from a single Slack channel with pagination
 */
async function loadSlackChannel(channel: string): Promise<SlackMessage[]> {
  const baseUrl = 'https://lev-boots-slack-api.jona-581.workers.dev/';
  const allMessages: SlackMessage[] = [];
  let page = 1;
  let hasMore = true;

  console.log(`Loading Slack channel: ${channel}`);

  while (hasMore) {
    try {
      const url = `${baseUrl}?channel=${channel}&page=${page}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SlackResponse = await response.json();
      allMessages.push(...data.items);

      console.log(`  ✓ Loaded page ${page} (${data.items.length} messages)`);

      // Check if there are more pages
      const totalPages = Math.ceil(data.total / data.limit);
      hasMore = page < totalPages;
      page++;

      // Delay to avoid rate limiting (increased to 1 second)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`  ✗ Error loading ${channel} page ${page}:`, error);
      throw error;
    }
  }

  console.log(`  ✓ Total messages from ${channel}: ${allMessages.length}`);
  return allMessages;
}

/**
 * Loads all Slack messages from all channels
 */
export async function loadSlackMessages(): Promise<LoadedDocument[]> {
  const channels = ['lab-notes', 'engineering', 'offtopic'];
  const documents: LoadedDocument[] = [];

  // Load channels sequentially to avoid rate limiting
  for (const channel of channels) {
    const messages = await loadSlackChannel(channel);

    // Combine all messages from this channel into one document
    const content = messages
      .map(msg => `[${msg.user} (${msg.role}), ${msg.ts}]: ${msg.text}`)
      .join('\n\n');

    documents.push({
      source: 'slack',
      source_id: channel,
      content,
    });

    // Additional delay between channels
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return documents;
}

/**
 * Loads all data from all sources
 */
export async function loadAllSources(): Promise<LoadedDocument[]> {
  console.log('\n=== Loading all data sources ===\n');

  const [pdfs, articles, slackMessages] = await Promise.all([
    loadPDFs(),
    loadArticles(),
    loadSlackMessages(),
  ]);

  const allDocuments = [...pdfs, ...articles, ...slackMessages];

  console.log(`\n=== Total documents loaded: ${allDocuments.length} ===\n`);

  return allDocuments;
}

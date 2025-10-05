# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Lev-Boots RAG (Retrieval-Augmented Generation) System** - an educational project for implementing a complete RAG pipeline. The project allows users to ask questions about Lev-Boots (fictional levitation boots) by retrieving relevant information from multiple sources and using an LLM to generate answers.

**Monorepo Structure:**
- `public/` - React/Vite frontend (UI is pre-built, no changes needed)
- `server/` - Express.js backend with Sequelize ORM (main implementation area)

## Development Commands

```bash
# Install dependencies
npm i

# Development (runs frontend + backend concurrently with hot reload)
npm run dev

# Build entire project
npm run build

# Frontend-only commands
npm run dev -w public
npm run build -w public

# Backend-only commands
npm run dev -w server        # tsx watch mode
npm run build -w server      # TypeScript compilation

# Database migrations
npm run migrate -w server
npm run migrate:create -w server
```

Frontend runs at http://localhost:5173/, backend at port 3000.

## Environment Setup

Required `.env` file in project root:
```
DATABASE_URL=postgresql://...     # Postgres with pgvector extension
GEMINI_API_KEY=...               # Or your preferred LLM API key
```

The database **must** be Postgres with pgvector. Migrations run automatically on server start and enable pgvector + create the `knowledge_base` table.

## Architecture

### Data Flow
1. **Data Loading** (`/api/load_data` POST): Fetches PDFs, markdown articles, and paginated Slack API → chunks content → embeds chunks → stores in `knowledge_base` table
2. **Question Answering** (`/api/ask` POST): Embeds user question → vector similarity search → retrieves relevant chunks → constructs LLM prompt → returns answer

### Key Files
- **`server/services/ragService.ts`**: Core RAG implementation (currently stubs)
  - `loadAllData()`: Implement complete data ingestion pipeline
  - `ask(userQuestion)`: Implement RAG retrieval + generation

- **`server/models/KnowledgeBase.ts`**: Sequelize model for vector embeddings
  - Two embedding columns: `embeddings_768` or `embeddings_1536` (choose ONE for the entire project)
  - Fields: `source`, `source_id`, `chunk_index`, `chunk_content`, embeddings

- **`server/config/database.ts`**: Auto-runs migrations on startup

- **`server/migrations/`**:
  - Enables pgvector extension
  - Creates `knowledge_base` table with IVFFlat indexes for cosine similarity

### Request/Response Flow
```
Client → ragRoutes → ragController → ragService
                                         ↓
                                    KnowledgeBase model
                                         ↓
                                    Postgres (pgvector)
```

## Data Sources (for RAG implementation)

**3 PDFs** (local files - path unknown, needs verification):
- `OpEd - A Revolution at Our Feet.pdf`
- `Research Paper - Gravitational Reversal Physics.pdf`
- `White Paper - The Development of Localized Gravity Reversal Technology.pdf`

**5 Articles** (fetch via HTTP):
```
https://gist.githubusercontent.com/JonaCodes/394d01021d1be03c9fe98cd9696f5cf3/raw/article-{1-5}_{ARTICLE_ID}.md

IDs: military-deployment-report, urban-commuting, hover-polo, warehousing, consumer-safety
```

**Slack API** (paginated + rate limited):
```
https://lev-boots-slack-api.jona-581.workers.dev/?channel={CHANNEL}&page={PAGE}

Channels: lab-notes, engineering, offtopic
```

## Implementation Notes

### Chunking Strategy
- Target: ~400 words per chunk
- Store with: `source` (type), `source_id` (unique identifier), `chunk_index` (order)

### Embeddings
- **Choose embeddings_768 OR embeddings_1536** - stick with one dimension throughout
- Gemini embeddings: https://ai.google.dev/gemini-api/docs/embeddings
- For Gemini: disable thinking to reduce token usage:
  ```javascript
  config: { thinkingConfig: { thinkingBudget: 0 } }
  ```

### Vector Similarity Search
- Use pgvector's cosine similarity operators
- IVFFlat indexes are pre-created on both embedding columns
- Example query pattern: `ORDER BY embeddings_768 <=> $query_embedding LIMIT k`

### RAG Requirements
- **loadAllData()**: Fetch → chunk → embed → store (avoid re-embedding already stored data)
- **ask()**: Embed question (same model as chunks!) → similarity search → prompt construction → LLM answer based ONLY on retrieved context

### Rate Limiting
- Start small when testing to avoid hitting Gemini rate limits
- Implement incremental loading (skip already-embedded chunks)

## Technology Stack
- Frontend: React 19, Vite, Mantine UI, MobX
- Backend: Express, TypeScript, Sequelize
- Database: PostgreSQL with pgvector extension
- LLM: Gemini API (or configurable alternative)

# RAG Investment Analyzer - System Architecture

## Tech Stack

**Frontend:** Next.js 14+ (React, TypeScript)
**Backend:** Express.js (Node.js, TypeScript)
**ORM:** Prisma
**Database:** PostgreSQL
**Vector Database:** ChromaDB
**LLM:** OpenAI GPT-4o / Anthropic Claude
**File Storage:** AWS S3 / Vercel Blob
**Job Queue:** Bull (Redis-based)

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js Frontend<br/>React Components]
    end

    subgraph "Application Layer"
        API[Express.js Backend<br/>REST API]
        Queue[Bull Queue<br/>Background Jobs]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL<br/>Metadata & Relations)]
        Chroma[(ChromaDB<br/>Vector Embeddings)]
        S3[S3 Storage<br/>Raw Documents]
        Redis[(Redis<br/>Queue & Cache)]
    end

    subgraph "External Services"
        OpenAI[OpenAI API<br/>Embeddings & LLM]
    end

    UI -->|HTTP/REST| API
    API --> Queue
    Queue --> Redis
    API --> PG
    API --> Chroma
    API --> S3
    API --> OpenAI
    Queue --> PG
    Queue --> Chroma
    Queue --> OpenAI
```

### Why Separate Backend?

- **No Timeout Limits:** Document processing takes 40-65 seconds (Vercel has 10s limit)
- **Background Jobs:** Bull queue handles long-running tasks asynchronously
- **Scalability:** Backend can scale independently from frontend
- **Better Control:** Full control over processing pipeline and resources

---

## System Components

### Frontend (Next.js)
- **Purpose:** User interface only (no API routes)
- **Responsibilities:**
  - Render UI components
  - Make API calls to Express backend
  - Display results and documents
- **Deployment:** Vercel
- **Structure:**
  ```
  /app
    /page.tsx                 # Query interface
    /documents/page.tsx       # Document list
    /components               # React components
    /lib/api-client.ts        # Backend API client
  ```

### Backend (Express.js)
- **Purpose:** REST API server
- **Responsibilities:**
  - Handle file uploads
  - Queue document processing jobs
  - Process queries (embedding + search + LLM)
  - Manage database operations
- **Deployment:** Railway, Render, or AWS
- **Port:** 3001
- **Structure:**
  ```
  /src
    /routes                   # API endpoints
    /services                 # Business logic
    /jobs                     # Background job workers
    /middleware               # Auth, validation, error handling
    /config                   # Configuration
  ```

### Background Jobs (Bull Queue)
- **Purpose:** Asynchronous document processing
- **Why Needed:** Processing takes too long for HTTP requests
- **Jobs:**
  1. `process-document` - Extract text, chunk, embed, store
  2. `cleanup-failed` - Retry or clean up failed documents
- **Workers:** 2-4 concurrent workers

### PostgreSQL
- **Purpose:** Metadata storage and relationships
- **Stores:**
  - Documents, Companies, Chunks (text only)
  - Queries, Results, Citations
  - User data, Processing status
- **Access:** Via Prisma ORM

### ChromaDB
- **Purpose:** Vector similarity search
- **Stores:**
  - Embeddings (1536-dimensional vectors)
  - Metadata (company, document type, etc.)
  - Chunk text (duplicated for quick retrieval)
- **Deployment:** Self-hosted on Railway/Docker

### Redis
- **Purpose:** Job queue and caching
- **Uses:**
  - Bull queue storage
  - Cache frequent query results
  - Rate limiting

---

## Document Ingestion Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Express API
    participant Queue as Bull Queue
    participant S3
    participant PG as PostgreSQL
    participant Worker
    participant Chroma as ChromaDB
    participant OpenAI

    User->>Frontend: Upload PDF
    Frontend->>API: POST /api/documents/upload
    API->>S3: Store raw file
    API->>PG: Create Document record<br/>(status: QUEUED)
    API->>Queue: Add process-document job
    API-->>Frontend: 202 Accepted<br/>{documentId, status: QUEUED}
    Frontend-->>User: Show processing status

    Note over Worker: Picks up job from queue
    Worker->>S3: Download file
    Worker->>Worker: Extract text (pdf-parse)
    Worker->>Worker: Chunk text (semantic)
    Worker->>PG: Store chunks
    Worker->>OpenAI: Generate embeddings (batch)
    OpenAI-->>Worker: Return vectors
    Worker->>Chroma: Store embeddings + metadata
    Worker->>PG: Update status: COMPLETED

    Frontend->>API: GET /api/documents/{id}/status
    API->>PG: Fetch status
    API-->>Frontend: {status: COMPLETED, chunks: 145}
    Frontend-->>User: Document ready!
```

### Steps Breakdown

1. **Upload (< 1s):** Store file in S3, create DB record, queue job
2. **Extract (5-10s):** Parse PDF, extract text and metadata
3. **Chunk (2-3s):** Split into 512-1024 token chunks with overlap
4. **Embed (30-45s):** Generate vectors via OpenAI (batched)
5. **Store (2-5s):** Save to ChromaDB with metadata
6. **Complete:** Update PostgreSQL status

**Total Time:** 40-65 seconds (runs in background)

---

## Query Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API as Express API
    participant OpenAI
    participant Chroma as ChromaDB
    participant PG as PostgreSQL

    User->>Frontend: "What are Tesla's revenue drivers?"
    Frontend->>API: POST /api/query
    API->>PG: Log query
    API->>OpenAI: Generate query embedding
    OpenAI-->>API: Vector [0.15, -0.23, ...]
    API->>Chroma: Semantic search<br/>(top 5 chunks)
    Chroma-->>API: Relevant chunks + metadata
    API->>PG: Fetch full chunk details
    API->>API: Assemble context + prompt
    API->>OpenAI: Generate answer (GPT-4o)
    OpenAI-->>API: Answer with citations
    API->>PG: Store query result + citations
    API-->>Frontend: {answer, citations, sources}
    Frontend-->>User: Display answer with clickable citations
```

### Performance

- **Query Embedding:** 200ms
- **ChromaDB Search:** 50-100ms
- **PostgreSQL Fetch:** 10-20ms
- **LLM Generation:** 2-3 seconds
- **Total:** ~3 seconds end-to-end

---

## API Endpoints

### Documents
```
POST   /api/documents/upload         Upload document (returns job ID)
GET    /api/documents                List all documents
GET    /api/documents/:id            Get document details
GET    /api/documents/:id/status     Get processing status
DELETE /api/documents/:id            Delete document
```

### Queries
```
POST   /api/query                    Submit query
GET    /api/queries                  List query history
GET    /api/queries/:id              Get specific query result
```

### Companies
```
GET    /api/companies                List all companies
GET    /api/companies/:ticker        Get company documents
```

---

## Database Schema (Key Models)

```typescript
// Prisma Schema Highlights

model Document {
  id              String          @id @default(uuid())
  filename        String
  fileUrl         String          // S3 URL
  status          DocumentStatus  // QUEUED, PROCESSING, COMPLETED, FAILED
  documentType    DocumentType    // FILING_10K, FILING_10Q, etc.

  companyId       String
  company         Company         @relation(...)

  chunksCount     Int             @default(0)
  processingError String?

  chunks          DocumentChunk[]
  citations       Citation[]
}

model DocumentChunk {
  id              String      @id @default(uuid())
  documentId      String
  text            String      @db.Text
  chunkIndex      Int
  pageNumber      Int?
  section         String?

  chromaId        String      @unique    // Links to ChromaDB
  embeddingStored Boolean     @default(false)
}

model Query {
  id              String        @id @default(uuid())
  queryText       String        @db.Text
  companyFilter   String?
  documentTypes   String[]
  result          QueryResult?
}

model QueryResult {
  id                String      @id @default(uuid())
  answer            String      @db.Text
  processingTimeMs  Int
  citations         Citation[]
}
```

**Full schema:** See `/Docs/architecture-diagrams.md`

---

## ChromaDB Structure

```typescript
// Collection: "investment_documents"

{
  ids: ["chunk_uuid_123"],
  embeddings: [[0.123, -0.456, 0.789, ...]],  // 1536 dims
  metadatas: [{
    documentId: "doc_uuid_456",
    documentName: "Tesla_10K_2023.pdf",
    company: "Tesla Inc",
    ticker: "TSLA",
    documentType: "FILING_10K",
    fiscalYear: 2023,
    pageNumber: 45,
    section: "Management Discussion & Analysis",
    chunkIndex: 12
  }],
  documents: ["Tesla's revenue for fiscal year 2023..."]
}

// Query Example
collection.query({
  query_embeddings: [query_vector],
  n_results: 5,
  where: { ticker: "TSLA", documentType: "FILING_10K" }
})
```

---

## Data Synchronization Strategy

### Challenge
Data lives in two places: PostgreSQL (metadata) and ChromaDB (vectors). Must stay in sync.

### Solution: Transaction-like Pattern

```typescript
async function storeDocumentChunks(chunks: Chunk[]) {
  // Wrap in Prisma transaction
  await prisma.$transaction(async (tx) => {
    // 1. Store in PostgreSQL
    await tx.documentChunk.createMany({ data: chunks })

    // 2. Store in ChromaDB
    try {
      await chromaCollection.add({
        ids: chunks.map(c => c.id),
        embeddings: chunks.map(c => c.embedding),
        metadatas: chunks.map(c => c.metadata),
        documents: chunks.map(c => c.text)
      })

      // 3. Mark as synced
      await tx.documentChunk.updateMany({
        where: { id: { in: chunks.map(c => c.id) } },
        data: { embeddingStored: true }
      })
    } catch (error) {
      // Rollback: Prisma transaction auto-rollbacks
      throw new Error('ChromaDB storage failed')
    }
  })
}
```

### Cleanup Job
Periodic background job verifies consistency and fixes orphaned records.

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Vercel"
        NextJS[Next.js Frontend]
    end

    subgraph "Railway/Render"
        Express[Express.js API<br/>Port 3001]
        Workers[Bull Workers<br/>2-4 instances]
    end

    subgraph "Managed Services"
        Neon[(Neon PostgreSQL)]
        UpstashRedis[(Upstash Redis)]
        ChromaDocker[ChromaDB<br/>Docker Container]
    end

    subgraph "Cloud Storage"
        S3[AWS S3]
    end

    subgraph "External APIs"
        OpenAI[OpenAI API]
    end

    NextJS -->|REST API| Express
    Express --> Neon
    Express --> ChromaDocker
    Express --> S3
    Express --> OpenAI
    Express --> UpstashRedis
    Workers --> UpstashRedis
    Workers --> Neon
    Workers --> ChromaDocker
    Workers --> OpenAI
```

### Infrastructure Costs (Production)

| Service | Provider | Cost/Month |
|---------|----------|------------|
| Frontend | Vercel Pro | $20 |
| Backend | Railway | $20 |
| PostgreSQL | Neon Scale | $20-50 |
| ChromaDB | Railway Container | $20 |
| Redis | Upstash | $10 |
| S3 Storage | AWS | $5-10 |
| OpenAI API | Usage-based | $50-200 |
| **Total** | | **$145-330** |

---

## Error Handling

### Document Processing Failures

```mermaid
graph TD
    A[Upload File] --> B{File Valid?}
    B -->|No| C[Return 400 Error]
    B -->|Yes| D[Queue Job]
    D --> E{Extract Text}
    E -->|Fails| F[Retry 3x]
    F -->|Still Fails| G[Mark FAILED<br/>Notify User]
    E -->|Success| H{Generate Embeddings}
    H -->|API Error| I[Retry with Backoff]
    I -->|Still Fails| G
    H -->|Success| J{Store in ChromaDB}
    J -->|Fails| K[Rollback PostgreSQL]
    K --> G
    J -->|Success| L[Mark COMPLETED]
```

### Query Processing Failures

- **Empty Query:** Return 400 with validation message
- **No Results:** Return empty result with suggestion
- **LLM Timeout:** Return 504, offer retry
- **Low Confidence:** Include disclaimer in response

---

## Project Structure

```
rag-investment-analyzer/
├── frontend/                 # Next.js application
│   ├── app/
│   ├── components/
│   └── lib/api-client.ts    # Backend API calls
│
├── backend/                  # Express.js application
│   ├── src/
│   │   ├── routes/          # API endpoints
│   │   │   ├── documents.ts
│   │   │   ├── queries.ts
│   │   │   └── companies.ts
│   │   ├── services/        # Business logic
│   │   │   ├── documentService.ts
│   │   │   ├── embeddingService.ts
│   │   │   ├── vectorStoreService.ts
│   │   │   ├── llmService.ts
│   │   │   └── ragPipeline.ts
│   │   ├── jobs/            # Bull job processors
│   │   │   └── processDocument.ts
│   │   ├── middleware/      # Auth, validation, errors
│   │   ├── config/          # Configuration
│   │   └── server.ts        # Express app entry
│   └── prisma/
│       └── schema.prisma
│
└── docs/                    # Documentation
```

---

## Key Design Decisions

### 1. Why Express over Next.js API Routes?
- No 10-second timeout limit
- Better for long-running tasks
- Independent scaling
- Background job support

### 2. Why Bull Queue?
- Reliable job processing
- Retry logic built-in
- Job progress tracking
- Scales with Redis

### 3. Why Dual Storage (PostgreSQL + ChromaDB)?
- PostgreSQL: Relations, transactions, metadata queries
- ChromaDB: Fast vector similarity search
- Best tool for each job

### 4. Why Prisma?
- Type-safe database access
- Automatic migrations
- Excellent TypeScript integration
- Good developer experience

---

## Development Workflow

### Local Setup
```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev              # Port 3001

# Frontend
cd frontend
npm install
npm run dev              # Port 3000

# ChromaDB (Docker)
docker run -p 8000:8000 chromadb/chroma

# Redis (Docker)
docker run -p 6379:6379 redis
```

### Environment Variables
```bash
# Backend .env
DATABASE_URL=postgresql://...
CHROMA_URL=http://localhost:8000
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
AWS_S3_BUCKET=...
FRONTEND_URL=http://localhost:3000

# Frontend .env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Next Steps

1. **Phase 1:** Set up Express backend with basic CRUD
2. **Phase 2:** Implement document processing pipeline
3. **Phase 3:** Build query processing with RAG
4. **Phase 4:** Create Next.js frontend UI
5. **Phase 5:** Deploy to production

See `/Docs/vision.md` for full implementation roadmap.

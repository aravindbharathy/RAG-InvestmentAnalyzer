# RAG Investment Analyzer - Backend

Express.js backend API for the RAG Investment Analyzer system.

## Features

- **Document Upload & Processing**: Upload PDF, DOCX, and TXT files for processing
- **Background Job Processing**: Bull Queue for asynchronous document processing
- **Vector Search**: ChromaDB integration for semantic search
- **AI-Powered Answers**: Grok (xAI) for answer generation, OpenAI for embeddings
- **RESTful API**: Clean REST API with proper error handling

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Vector DB**: ChromaDB
- **Queue**: Bull (Redis-based)
- **AI/ML**:
  - Grok (xAI) for LLM completions
  - OpenAI for embeddings

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── database.ts   # Prisma client
│   │   ├── redis.ts      # Redis client
│   │   ├── chromadb.ts   # ChromaDB client
│   │   ├── openai.ts     # Grok & OpenAI clients
│   │   └── queue.ts      # Bull queue setup
│   ├── services/         # Business logic
│   │   ├── ai.service.ts           # AI operations
│   │   ├── chromadb.service.ts     # Vector operations
│   │   ├── document.service.ts     # Document processing
│   │   └── query.service.ts        # Query processing
│   ├── jobs/             # Background workers
│   │   └── document-processor.worker.ts
│   ├── middleware/       # Express middleware
│   │   ├── error.middleware.ts
│   │   └── upload.middleware.ts
│   ├── routes/           # API routes
│   │   ├── document.routes.ts
│   │   ├── query.routes.ts
│   │   └── company.routes.ts
│   ├── utils/            # Utilities
│   │   └── chunking.ts   # Text chunking
│   └── server.ts         # Main server file
├── prisma/
│   └── schema.prisma     # Database schema
├── uploads/              # Uploaded files
└── .env                  # Environment variables
```

## API Endpoints

### Documents
- `POST /api/documents/upload` - Upload a document
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get document details
- `GET /api/documents/:id/status` - Get processing status
- `DELETE /api/documents/:id` - Delete document

### Queries
- `POST /api/queries` - Submit a query
- `GET /api/queries` - Get query history
- `GET /api/queries/:id` - Get specific query result

### Companies
- `GET /api/companies` - List all companies
- `GET /api/companies/:ticker` - Get company by ticker
- `POST /api/companies` - Create a new company

### Health
- `GET /health` - Health check endpoint

## Environment Variables

Required variables in `.env`:

```env
# Database
DATABASE_URL="postgresql://user@localhost:5432/rag_investment_db"

# Redis
REDIS_URL="redis://localhost:6379"

# ChromaDB
CHROMA_URL="http://localhost:8000"

# AI Services
GROK_API_KEY="xai-your-key-here"
OPENAI_API_KEY="sk-your-key-here"

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR="./uploads"
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database
```bash
npx prisma migrate dev
npx prisma generate
```

### 3. Start Services

Make sure these are running:
- PostgreSQL (port 5432)
- Redis (port 6379)
- ChromaDB (port 8000)

Start ChromaDB:
```bash
chroma run --path ~/chromadb_data --port 8000
```

### 4. Run Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Development

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

### Database Management
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Generate Prisma Client
npx prisma generate

# View database
npx prisma studio
```

## Document Processing Flow

1. **Upload**: Client uploads file via `POST /api/documents/upload`
2. **Queue**: Document is queued for background processing
3. **Extract**: Text is extracted from PDF/DOCX/TXT
4. **Chunk**: Text is split into 800-token chunks with 100-token overlap
5. **Embed**: Chunks are embedded using OpenAI (batch processing)
6. **Store**: Embeddings stored in ChromaDB, metadata in PostgreSQL
7. **Complete**: Document status updated to COMPLETED

## Query Processing Flow

1. **Query**: Client submits question via `POST /api/queries`
2. **Embed**: Query is embedded using OpenAI
3. **Search**: ChromaDB returns top-K similar chunks
4. **Context**: Chunks are fetched from PostgreSQL
5. **Generate**: Grok generates answer with citations
6. **Store**: Query result and citations saved
7. **Return**: Answer with citations returned to client

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `202` - Accepted (async operation queued)
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Error response format:
```json
{
  "status": "error",
  "message": "Error description"
}
```

## API Keys

### Get Grok API Key
1. Visit https://console.x.ai
2. Sign up/login
3. Create a new API key
4. Add to `.env` as `GROK_API_KEY`

### Get OpenAI API Key (for embeddings)
1. Visit https://platform.openai.com
2. Sign up/login
3. Create a new API key
4. Add to `.env` as `OPENAI_API_KEY`

## Troubleshooting

### ChromaDB Connection Error
```bash
# Make sure ChromaDB is running
chroma run --path ~/chromadb_data --port 8000
```

### Redis Connection Error
```bash
# Check Redis is running
redis-cli ping

# Start Redis (macOS)
brew services start redis
```

### PostgreSQL Connection Error
```bash
# Verify DATABASE_URL in .env
# Check PostgreSQL is running
psql -U your_user -d rag_investment_db -c "SELECT 1;"
```

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

## License

MIT

# Architecture Tradeoffs & Practical Considerations

## Overview

This document walks through the key architectural decisions, their tradeoffs, and practical implications for the RAG Investment Intelligence System.

---

## 1. Next.js Full-Stack vs Separate Backend

### Option A: Next.js Full-Stack (Recommended for POC)

**What it means:**
- Frontend and backend in same codebase
- API routes in `/app/api/`
- Deploy everything together on Vercel

**Pros:**
- ✅ Faster development (one codebase, one deploy)
- ✅ Better TypeScript sharing between frontend/backend
- ✅ Simpler deployment (single Vercel project)
- ✅ Built-in API routes with file-based routing
- ✅ Lower infrastructure costs (one service)
- ✅ Server components can directly query database (no API call needed)
- ✅ Great developer experience with hot reload

**Cons:**
- ❌ Hard to scale backend independently
- ❌ API routes have 10-second timeout on Vercel (problem for long document processing)
- ❌ Everything redeploys together (frontend change = backend redeploy)
- ❌ Limited control over backend runtime environment
- ❌ May hit Vercel function size limits with large dependencies

**Real-world Impact:**
```
Scenario: Processing a 50MB 10-K PDF
- Text extraction: 5-10 seconds
- Chunking: 2-3 seconds
- Embedding generation (145 chunks): 30-45 seconds
- ChromaDB storage: 2-5 seconds
TOTAL: 40-65 seconds

❌ PROBLEM: Exceeds Vercel's 10-second timeout for Hobby/Pro plans
✅ SOLUTION: Use background jobs (see Option B) or upgrade to Enterprise
```

**Best for:**
- POC/MVP development
- Small to medium scale (< 1000 documents)
- Teams < 5 developers
- Limited budget

### Option B: Separate Backend (FastAPI/Express)

**What it means:**
- Next.js for frontend only
- Separate Python FastAPI or Node Express backend
- Two deployments, two repositories (or monorepo)

**Pros:**
- ✅ No timeout limits on document processing
- ✅ Can scale backend independently
- ✅ Better for CPU-intensive tasks (Python ecosystem)
- ✅ Background job queues (Celery, Bull)
- ✅ More control over infrastructure
- ✅ Can use different tech for different services

**Cons:**
- ❌ More complex deployment (2+ services)
- ❌ Need CORS configuration
- ❌ More infrastructure to maintain
- ❌ Type safety between frontend/backend requires extra work (tRPC, GraphQL, or code generation)
- ❌ Higher costs (multiple services running)
- ❌ Slower development iteration

**Real-world Impact:**
```
Infrastructure Costs (Monthly):
Next.js Frontend:
  - Vercel Hobby: $0 (or Pro: $20)

Backend:
  - Railway/Render: $5-20
  - Or AWS ECS: $30-50
  - Redis (for jobs): $5-10

TOTAL: $10-80/month vs $0-20 for full-stack Next.js
```

**Best for:**
- Production applications
- Heavy document processing workloads
- Need for background jobs
- Multiple backend services

### My Recommendation:
**Start with Next.js Full-Stack + Background Jobs Workaround**

```typescript
// Workaround for long-running tasks
// /app/api/documents/upload/route.ts
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file')

  // Store file metadata immediately
  const document = await prisma.document.create({
    data: {
      filename: file.name,
      status: 'QUEUED'
    }
  })

  // Trigger async processing (doesn't wait for completion)
  processDocumentAsync(document.id).catch(console.error)

  // Return immediately
  return Response.json({
    documentId: document.id,
    status: 'QUEUED'
  })
}

// Client polls this endpoint for status
GET /api/documents/{id}/status
```

**When to migrate:** Once you're processing > 50 documents/day or hitting timeout issues regularly.

---

## 2. ChromaDB vs Other Vector Databases

### Option A: ChromaDB (Recommended for Start)

**Pros:**
- ✅ Completely free and open source
- ✅ Easy local development (no account signup)
- ✅ Can run in-memory for tests
- ✅ Simple API (similar to a Python dict)
- ✅ Built-in metadata filtering
- ✅ Can persist to disk (no external service needed for POC)

**Cons:**
- ❌ No managed cloud offering (yet - in beta)
- ❌ Need to self-host for production
- ❌ Limited documentation vs Pinecone
- ❌ Less mature than Pinecone/Weaviate
- ❌ Scaling to millions of vectors requires more work
- ❌ No built-in replication/backup in open-source version

**Cost Analysis:**
```
Development: $0 (local)
Production (self-hosted):
  - DigitalOcean Droplet (4GB RAM): $24/month
  - AWS EC2 t3.medium: $30/month
  - Or Railway: $10-20/month

For 100,000 document chunks:
  - Storage: ~400MB embeddings + metadata
  - RAM needed: 2-4GB recommended
```

### Option B: Pinecone

**Pros:**
- ✅ Fully managed (no infrastructure)
- ✅ Excellent documentation and support
- ✅ Built-in monitoring and analytics
- ✅ Auto-scaling
- ✅ High performance at scale
- ✅ Backup and replication included

**Cons:**
- ❌ Costs money from day 1
- ❌ Vendor lock-in
- ❌ Free tier very limited (1 index, 100K vectors)
- ❌ Pricing can get expensive at scale

**Cost Analysis:**
```
Free Tier:
  - 1 index
  - 100K vectors (1536 dimensions)
  - Good for ~70 documents

Standard Plan: $70/month
  - 5M vectors
  - ~3,500 documents

Enterprise: $500+/month
```

### Option C: Weaviate

**Pros:**
- ✅ Open source + managed cloud option
- ✅ Built-in hybrid search (vector + keyword)
- ✅ GraphQL API
- ✅ Good documentation
- ✅ Active community

**Cons:**
- ❌ More complex to set up
- ❌ Steeper learning curve
- ❌ Cloud pricing similar to Pinecone
- ❌ Might be overkill for this use case

### Option D: PostgreSQL with pgvector

**Pros:**
- ✅ Single database for everything
- ✅ No additional service needed
- ✅ Simpler architecture
- ✅ ACID transactions
- ✅ Familiar SQL queries

**Cons:**
- ❌ Slower for large-scale vector search (> 100K vectors)
- ❌ Limited to cosine/L2 similarity
- ❌ No specialized vector indexing (HNSW support is basic)
- ❌ Uses more memory for large datasets

**Performance Comparison:**
```
Search 1000 vectors (1536 dims):
- ChromaDB/Pinecone: ~50ms
- pgvector: ~100-200ms

Search 100,000 vectors:
- ChromaDB/Pinecone: ~100ms (with HNSW index)
- pgvector: ~500-1000ms

Search 1M+ vectors:
- ChromaDB: ~200ms (with tuning)
- Pinecone: ~150ms (optimized)
- pgvector: ~2-5 seconds (not practical)
```

### My Recommendation:

**Development/POC:** ChromaDB (local)
```bash
# Super simple setup
pip install chromadb
# Run in-memory or persist to disk
```

**Production (< 500K vectors):** ChromaDB (self-hosted)
```
Cost: $20-30/month
Effort: Medium (Docker deployment)
Performance: Excellent
```

**Production (> 500K vectors OR want zero maintenance):** Pinecone
```
Cost: $70-500/month
Effort: Low (managed)
Performance: Excellent
```

**Special Case (Budget constrained + < 50K vectors):** pgvector
```
Cost: $0 (same PostgreSQL)
Effort: Low
Performance: Acceptable
```

---

## 3. Dual Storage (PostgreSQL + ChromaDB) vs Single Database

### Current Design: Dual Storage

**Architecture:**
```
PostgreSQL:                    ChromaDB:
- Document metadata           - Embeddings
- Chunks (text + metadata)    - Similarity search
- Queries & Results           - Metadata filters
- Citations
- Users
```

**Pros:**
- ✅ Best tool for each job (SQL for relations, vector DB for search)
- ✅ Can query metadata without loading vectors
- ✅ Easier to add features (users, analytics, etc.)
- ✅ Better for complex queries (joins, aggregations)
- ✅ Can swap vector DB later without losing metadata

**Cons:**
- ❌ Data in two places (consistency risk)
- ❌ More complex to keep in sync
- ❌ Two databases to backup/maintain
- ❌ Slightly more code complexity

### Alternative: PostgreSQL with pgvector Only

**Pros:**
- ✅ Single source of truth
- ✅ ACID transactions
- ✅ Simpler architecture
- ✅ One backup/restore process
- ✅ No sync issues

**Cons:**
- ❌ Slower vector search at scale
- ❌ More expensive queries (always loading embeddings)
- ❌ Hard to scale vector search independently

### Real-world Scenario:

**Query: "What are Tesla's revenue drivers?"**

**Dual Storage Flow:**
```
1. Generate query embedding: 200ms (OpenAI API)
2. ChromaDB search top 5 chunks: 50ms
3. Fetch chunk details from PostgreSQL: 10ms (by ID)
4. LLM generation: 2000ms
TOTAL: ~2.3 seconds
```

**pgvector Flow:**
```
1. Generate query embedding: 200ms (OpenAI API)
2. PostgreSQL vector search + metadata: 150ms
3. LLM generation: 2000ms
TOTAL: ~2.35 seconds

Not much difference for small scale!
```

**At 100K chunks:**
```
Dual Storage: ~2.5 seconds
pgvector: ~4-5 seconds (search becomes bottleneck)
```

### My Recommendation:

**For POC (< 10K chunks):** Either works fine
- Use pgvector if you want simplicity
- Use ChromaDB if you want future scalability

**For Production (> 10K chunks):** Dual storage
- Better performance
- More flexible
- Easier to scale

---

## 4. Prisma vs Raw SQL / Other ORMs

### Option A: Prisma (Recommended)

**Pros:**
- ✅ Type-safe queries (TypeScript integration)
- ✅ Automatic migrations
- ✅ Great developer experience
- ✅ Generated types match database schema
- ✅ Built-in connection pooling
- ✅ Works great with Next.js

**Cons:**
- ❌ Slightly slower than raw SQL (5-10% overhead)
- ❌ Complex queries can be verbose
- ❌ Generated client adds to bundle size
- ❌ Learning curve for advanced features

**Example:**
```typescript
// Type-safe, autocomplete works
const documents = await prisma.document.findMany({
  where: {
    company: { ticker: 'TSLA' },
    documentType: 'FILING_10K'
  },
  include: {
    chunks: true,
    company: true
  }
})
// TypeScript knows exact shape of 'documents'
```

### Option B: Raw SQL with Postgres.js

**Pros:**
- ✅ Maximum performance
- ✅ Full SQL power (window functions, CTEs, etc.)
- ✅ Smaller bundle size
- ✅ No generated code

**Cons:**
- ❌ No type safety
- ❌ Manual migrations
- ❌ SQL injection risk if not careful
- ❌ More boilerplate code

**Example:**
```typescript
const documents = await sql`
  SELECT d.*, c.name as company_name
  FROM documents d
  JOIN companies c ON d.company_id = c.id
  WHERE c.ticker = ${ticker}
`
// No type checking - documents is 'any[]'
```

### My Recommendation:

**Use Prisma** unless:
- You have very complex SQL queries that Prisma can't express
- You're optimizing for every millisecond (rare)
- Team is SQL experts and TypeScript beginners

**Hybrid Approach (Best of both):**
```typescript
// Most queries: Prisma
const doc = await prisma.document.findUnique({ where: { id } })

// Complex queries: Raw SQL via Prisma
const stats = await prisma.$queryRaw`
  SELECT
    c.ticker,
    COUNT(d.id) as doc_count,
    AVG(d.chunks_count) as avg_chunks
  FROM companies c
  LEFT JOIN documents d ON c.id = d.company_id
  GROUP BY c.ticker
`
```

---

## 5. File Storage: S3 vs Vercel Blob vs Local

### Option A: AWS S3 / R2

**Pros:**
- ✅ Industry standard, proven at scale
- ✅ Very cheap storage ($0.023/GB/month)
- ✅ Built-in CDN (CloudFront)
- ✅ Lifecycle rules (auto-archive old files)
- ✅ Versioning and backup

**Cons:**
- ❌ Need AWS account setup
- ❌ More configuration (IAM, buckets, etc.)
- ❌ Egress costs can add up (data transfer out)

**Cost Example:**
```
100 documents × 5MB each = 500MB
Storage: $0.01/month
Uploads (1000/month): $0.01
Downloads (500/month): $0.04
TOTAL: ~$0.06/month

1000 documents × 5MB = 5GB
Storage: $0.12/month
TOTAL: ~$1-2/month with traffic
```

### Option B: Vercel Blob

**Pros:**
- ✅ Zero config (if using Vercel)
- ✅ Integrated with Next.js
- ✅ Automatic CDN
- ✅ Simple API

**Cons:**
- ❌ More expensive than S3
- ❌ Vendor lock-in to Vercel
- ❌ Limited free tier (6GB bandwidth/month)

**Cost Example:**
```
Hobby Plan (Free):
- 6GB bandwidth/month
- ~1000 document views

Pro Plan ($20/month):
- 100GB included
- $0.15/GB overage
```

### Option C: Local File System

**Pros:**
- ✅ Free (for development)
- ✅ Simple (no external service)
- ✅ Fast (no network latency)

**Cons:**
- ❌ Not scalable (disk space limits)
- ❌ Lost on redeployment (serverless)
- ❌ No CDN/caching
- ❌ Not suitable for production

### My Recommendation:

**Development:** Local file system
```typescript
// Store in /public/uploads (gitignored)
const filePath = path.join(process.cwd(), 'uploads', filename)
await fs.writeFile(filePath, buffer)
```

**Production on Vercel:** Vercel Blob (simplicity)
```typescript
import { put } from '@vercel/blob'
const blob = await put(filename, file, { access: 'public' })
```

**Production (cost-optimized):** AWS S3 or Cloudflare R2
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
await s3.send(new PutObjectCommand({ Bucket, Key, Body }))
```

**Switch to S3 when:** Monthly Vercel Blob costs exceed $10

---

## 6. Embedding Models: OpenAI vs Open Source

### Option A: OpenAI text-embedding-3-large

**Specs:**
- Dimensions: 1536
- Cost: $0.13 per 1M tokens (~$0.00013 per page)
- Quality: Excellent
- Speed: ~200ms per request (batch faster)

**Pros:**
- ✅ Best-in-class quality
- ✅ Maintained and updated by OpenAI
- ✅ Simple API
- ✅ No infrastructure needed

**Cons:**
- ❌ Costs money (though cheap)
- ❌ Requires internet connection
- ❌ Data sent to OpenAI
- ❌ Rate limits (3000 RPM on tier 1)

**Cost Calculation:**
```
1 document = 100 pages = ~75,000 tokens
Cost per document: $0.01

100 documents: $1.00
1000 documents: $10.00

Query embeddings (negligible):
1000 queries × 20 tokens = 20K tokens = $0.0026
```

### Option B: Open Source (sentence-transformers)

**Popular Models:**
- `all-MiniLM-L6-v2`: 384 dims, fast, decent quality
- `all-mpnet-base-v2`: 768 dims, slower, better quality
- `bge-large-en-v1.5`: 1024 dims, SOTA open source

**Pros:**
- ✅ Completely free
- ✅ No data sent to third parties
- ✅ No rate limits
- ✅ Can run offline
- ✅ Smaller embedding sizes (storage savings)

**Cons:**
- ❌ Need to host inference (GPU helpful)
- ❌ Lower quality than OpenAI (usually)
- ❌ More complex setup
- ❌ Need to manage model updates

**Infrastructure Cost:**
```
CPU-only inference:
- Cloud VM: $20-50/month
- Speed: ~500ms per embedding (slow!)

GPU inference (T4):
- Cloud VM: $100-200/month
- Speed: ~50ms per embedding
```

### My Recommendation:

**For POC/Production:** OpenAI embeddings
- Cost is negligible vs development time
- Better quality = better user experience
- Simple integration

**When to consider open source:**
- Processing 10K+ documents (costs add up)
- Privacy requirements (can't send data out)
- Already have GPU infrastructure

---

## 7. LLM Provider: OpenAI vs Anthropic vs Open Source

### Option A: OpenAI GPT-4

**Pricing:**
- GPT-4-turbo: $10/1M input tokens, $30/1M output tokens
- GPT-4o: $2.50/1M input, $10/1M output

**Pros:**
- ✅ Excellent reasoning and accuracy
- ✅ Follows citation instructions well
- ✅ 128K context window
- ✅ Fast (1-3 seconds for answers)

**Cons:**
- ❌ More expensive than alternatives
- ❌ Less nuanced than Claude for analysis

**Cost per query:**
```
Average query:
- Input: ~3K tokens (context chunks) = $0.0075
- Output: ~500 tokens (answer) = $0.015
- TOTAL: ~$0.02 per query

1000 queries/month: $20
5000 queries/month: $100
```

### Option B: Anthropic Claude 3.5 Sonnet

**Pricing:**
- Input: $3/1M tokens
- Output: $15/1M tokens

**Pros:**
- ✅ Best for long-form analysis
- ✅ Better at following complex instructions
- ✅ 200K context window
- ✅ Cheaper than GPT-4-turbo

**Cons:**
- ❌ Slower responses (3-5 seconds)
- ❌ Rate limits stricter initially

**Cost per query:**
```
Average query:
- Input: ~3K tokens = $0.009
- Output: ~500 tokens = $0.0075
- TOTAL: ~$0.017 per query

Slightly cheaper than GPT-4
```

### Option C: Open Source (Llama 3, Mixtral)

**Pros:**
- ✅ Free after infrastructure
- ✅ Full control and privacy
- ✅ No rate limits

**Cons:**
- ❌ Lower quality (especially for citations)
- ❌ Need GPU server ($100-500/month)
- ❌ More complex to maintain

### My Recommendation:

**Start with:** GPT-4o (best price/performance)
**Switch to Claude if:** You need deeper analytical answers
**Open source when:** Costs exceed $500/month AND you have ML ops expertise

**Pro tip:** Use GPT-4o-mini for initial development ($0.15/1M input)

---

## 8. Deployment Strategy

### Option A: Vercel (Recommended for Next.js)

**Pros:**
- ✅ Zero-config deployment
- ✅ Automatic HTTPS, CDN
- ✅ Preview deployments for PRs
- ✅ Edge functions
- ✅ Great DX (git push to deploy)

**Cons:**
- ❌ 10-second function timeout (Hobby/Pro)
- ❌ Can get expensive at scale
- ❌ Limited backend capabilities

**Cost:**
```
Hobby: $0
- Perfect for POC
- 100GB bandwidth

Pro: $20/month
- Team features
- 1TB bandwidth

Enterprise: Custom
- No timeouts
- Dedicated support
```

### Option B: Self-Hosted (Railway, Render, DigitalOcean)

**Pros:**
- ✅ More control
- ✅ No timeouts
- ✅ Can run background jobs
- ✅ Potentially cheaper at scale

**Cons:**
- ❌ More setup and maintenance
- ❌ Need to configure CI/CD
- ❌ Manage scaling yourself

**Cost:**
```
Railway Starter: $5/month
- 512MB RAM, 1 CPU
- Good for small apps

Render Pro: $7/instance/month
- Better than Railway pricing

DigitalOcean Droplet: $12/month
- More control, more work
```

### My Recommendation:

**POC Phase:** Vercel Hobby ($0)
**Production < 1000 users:** Vercel Pro ($20)
**Production > 1000 users:** Evaluate based on costs

---

## Summary: Recommended Tech Stack by Phase

### Phase 1: POC (Week 1-9)
```
Frontend: Next.js (Vercel Hobby - $0)
Database: PostgreSQL (Neon free tier - $0)
Vector DB: ChromaDB (local - $0)
File Storage: Local filesystem - $0
Embeddings: OpenAI ($5-10/month)
LLM: GPT-4o-mini ($2-5/month)
TOTAL: ~$10/month
```

### Phase 2: Beta (50-100 users)
```
Frontend: Next.js (Vercel Pro - $20)
Database: PostgreSQL (Neon Pro - $20)
Vector DB: ChromaDB (Railway - $20)
File Storage: Vercel Blob - included
Embeddings: OpenAI ($10-20/month)
LLM: GPT-4o ($30-50/month)
TOTAL: ~$100-130/month
```

### Phase 3: Production (500+ users)
```
Frontend: Next.js (Vercel Pro - $20)
Database: PostgreSQL (Neon Scale - $50)
Vector DB: Pinecone (Standard - $70)
File Storage: AWS S3 ($5-10)
Embeddings: OpenAI ($50-100/month)
LLM: GPT-4o ($200-400/month)
Monitoring: Sentry ($26/month)
TOTAL: ~$420-675/month
```

---

## Key Decision Framework

### When Starting:
1. **Choose simplicity over optimization**
   - One codebase (Next.js full-stack)
   - Managed services (Vercel, Neon)
   - Proven tools (OpenAI, Prisma)

2. **Optimize later based on real data**
   - Don't guess at scale
   - Measure first, then optimize
   - Most early assumptions are wrong

### When to Optimize:
- Costs exceed $200/month → Evaluate cheaper alternatives
- Processing > 100 docs/day → Add background jobs
- Search > 100K vectors → Upgrade vector DB
- Queries > 5K/day → Add caching layer

### Red Flags (Don't Do This):
- ❌ Overengineering (microservices for POC)
- ❌ Premature optimization (custom everything)
- ❌ Picking tech because it's "cool" vs solving problem
- ❌ Ignoring managed services to "save money" (time is money)


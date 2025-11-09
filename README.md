# RAG-Powered Investment Intelligence System

A Retrieval-Augmented Generation (RAG) application designed to help investment managers and analysts analyze financial documents more efficiently. Query SEC filings, earnings transcripts, and analyst reports using natural language with full citation tracking.

## 🎯 Business Objectives

- **Reduce research time by 50%** (from 20 hours/week to 10 hours/week per analyst)
- Enable deeper analysis through automated cross-document synthesis
- Provide 100% source-verified insights with citation tracking
- Scale research capacity without proportional headcount increases

## 🏗️ Tech Stack

**Frontend:**
- Next.js 14+ (React, TypeScript, Tailwind CSS)

**Backend:**
- Express.js (Node.js, TypeScript)
- Prisma ORM
- Bull Queue (background jobs)

**Databases:**
- PostgreSQL (metadata & relations)
- ChromaDB (vector embeddings)
- Redis (job queue & cache)

**AI/ML:**
- OpenAI GPT-4o (LLM)
- OpenAI text-embedding-3-large (embeddings)

**Storage:**
- AWS S3 / Vercel Blob (documents)

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **PostgreSQL** v14+ (macOS: `brew install postgresql@15`, Ubuntu: `apt install postgresql`)
- **Redis** (macOS: `brew install redis`, Ubuntu: `apt install redis-server`)
- **Python 3.8+** (for ChromaDB: `pip3 install chromadb`)
- **Git** ([Download](https://git-scm.com/))
- **OpenAI API Key** ([Get one](https://platform.openai.com/))

### Installation

```bash
# 1. Install services (see SETUP.md for detailed instructions)
# PostgreSQL, Redis, and ChromaDB

# 2. Start ChromaDB (Terminal 1)
chroma run --path ~/chromadb_data --port 8000

# 3. Set up backend (Terminal 2)
cd backend
npm install
npx prisma migrate dev
npm run dev  # Runs on http://localhost:3001

# 4. Set up frontend (Terminal 3)
cd frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

**📖 Full setup guide:** See [SETUP.md](./SETUP.md)

## 📋 Core Features

### 1. Natural Language Query Interface
Ask questions like:
- "What are Tesla's main revenue drivers and growth outlook for 2024?"
- "Compare Apple's R&D spending to Microsoft and Google over the last 5 years"
- "What risks does Tesla identify related to supply chain?"

### 2. Document Management
Upload and process:
- SEC Filings (10-K, 10-Q, 8-K)
- Earnings Call Transcripts
- Analyst Reports
- Financial Statements

### 3. Intelligent Retrieval
- Semantic search (not just keyword matching)
- Context-aware chunking (512-1024 tokens)
- Vector similarity using embeddings

### 4. Answer Generation with Citations
- Every claim linked to source document
- Page numbers and sections referenced
- Confidence scores for each citation
- Direct PDF viewing

### 5. Cross-Document Analysis
- Compare metrics across time periods
- Track changes in strategy or risk factors
- Identify contradictions
- Synthesize insights from multiple sources

## 🏛️ Architecture

```
┌─────────────┐
│  Next.js    │  Frontend (React, Tailwind)
│  Frontend   │  Port: 3000
└──────┬──────┘
       │ HTTP/REST
       ▼
┌─────────────┐
│  Express.js │  Backend API
│  Backend    │  Port: 3001
└──────┬──────┘
       │
       ├──────► PostgreSQL (metadata)
       ├──────► ChromaDB (vectors)
       ├──────► Redis (jobs)
       ├──────► S3 (files)
       └──────► OpenAI API (embeddings & LLM)
```

**📐 Detailed architecture:** See [Docs/architecture.md](./Docs/architecture.md)

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete installation guide
- **[Docs/architecture.md](./Docs/architecture.md)** - System architecture with diagrams
- **[Docs/architecture-tradeoffs.md](./Docs/architecture-tradeoffs.md)** - Technical decisions & tradeoffs
- **[Docs/architecture-diagrams.md](./Docs/architecture-diagrams.md)** - Detailed data flows
- **[Docs/vision.md](./Docs/vision.md)** - Full project specification
- **[claude.md](./claude.md)** - AI assistant context

## 🔄 Development Workflow

### Start all services:
```bash
# Terminal 1: ChromaDB
chroma run --path ~/chromadb_data --port 8000

# Terminal 2: Backend
cd backend && npm run dev

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Or use PM2 (Process Manager):
```bash
pm2 start ecosystem.config.js
pm2 logs
```

### Check service health:
```bash
# PostgreSQL
psql -U postgres -c "SELECT version();"

# Redis
redis-cli ping

# ChromaDB
curl http://localhost:8000/api/v1/heartbeat
```

### View database:
```bash
cd backend
npx prisma studio  # Opens at http://localhost:5555
```

## 📊 API Endpoints

### Documents
```
POST   /api/documents/upload         Upload document
GET    /api/documents                List documents
GET    /api/documents/:id/status     Processing status
DELETE /api/documents/:id            Delete document
```

### Queries
```
POST   /api/query                    Submit query
GET    /api/queries                  Query history
GET    /api/queries/:id              Get result
```

### Companies
```
GET    /api/companies                List companies
GET    /api/companies/:ticker        Get company docs
```

## 🗂️ Project Structure

```
rag-investment-analyzer/
├── frontend/              # Next.js app
│   ├── app/              # Pages & layouts
│   ├── components/       # React components
│   └── lib/              # API client & utils
│
├── backend/              # Express.js app
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── jobs/        # Background workers
│   │   └── middleware/  # Auth, validation
│   └── prisma/
│       └── schema.prisma
│
├── docker-compose.yml    # Local services
├── SETUP.md             # Installation guide
└── Docs/                # Documentation
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## 📈 Success Metrics (POC Phase)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time Savings | 50% reduction | Before/after time tracking |
| Answer Accuracy | 90%+ | Expert review |
| Source Attribution | 100% | All claims cited |
| User Satisfaction | 4.0+/5.0 | Post-query surveys |
| Query Response | < 3 seconds | System monitoring |

## 💰 Development Costs

| Service | Cost/Month |
|---------|-----------|
| OpenAI API (dev/testing) | $5-10 |
| AWS S3 (optional) | $1-5 |
| **Total** | **$5-15** |

*All other services (PostgreSQL, Redis, ChromaDB) run locally for free.*

## 🚧 Implementation Roadmap

### Phase 1: POC (9 Weeks)
- ✅ Week 1-2: Infrastructure setup
- ⏳ Week 3-5: Core RAG pipeline
- ⏳ Week 6-8: UI & testing
- ⏳ Week 9: Evaluation & refinement

### Phase 2: Production
- Multi-user support
- Advanced analytics
- API integrations
- Enhanced UI/UX

## 🔐 Security Features

- Authentication & authorization (planned)
- Encryption at rest and in transit
- Document-level permissions
- Audit logging
- Prompt injection protection
- Rate limiting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Getting Help

- **Setup Issues:** See [SETUP.md](./SETUP.md) troubleshooting section
- **Architecture Questions:** Check [Docs/architecture.md](./Docs/architecture.md)
- **Bug Reports:** Open an issue on GitHub

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [OpenAI](https://openai.com/)
- Vector search by [ChromaDB](https://www.trychroma.com/)

---

**Ready to get started?** Follow the [Setup Guide](./SETUP.md) to install everything you need!

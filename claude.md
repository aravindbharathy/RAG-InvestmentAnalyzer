# Claude Context: RAG-Powered Investment Intelligence System

## Project Overview

This is a Retrieval-Augmented Generation (RAG) application designed to help investment managers and analysts analyze financial documents efficiently. The system enables natural language queries across SEC filings, earnings transcripts, analyst reports, and other investment documents, providing source-backed insights with full citation tracking.

### Key Business Objectives
- Reduce research time by 50% (from 20 to 10 hours/week per analyst)
- Enable deeper analysis through automated cross-document synthesis
- Provide 100% source-verified insights with citation tracking
- Scale research capacity without proportional headcount increases

### Target Users
- Investment Managers
- Investment Analysts
- Research Teams at investment firms

## Technical Architecture

### Technology Stack

**Backend:**
- Language: Python 3.10+
- Framework: FastAPI or Flask
- RAG Framework: LangChain or LlamaIndex
- LLM Provider: OpenAI (GPT-4) or Anthropic (Claude 3)
- Embedding Model: OpenAI text-embedding-3-large or sentence-transformers
- Vector Database: Pinecone, Weaviate, or Qdrant
- Document Storage: S3 or Azure Blob Storage
- Metadata DB: PostgreSQL
- Cache Layer: Redis

**Frontend:**
- Framework: React or Next.js
- UI Library: Material-UI, Chakra UI, or Tailwind CSS
- State Management: React Context or Zustand
- PDF Viewer: react-pdf or PDF.js

**DevOps:**
- Containerization: Docker
- Orchestration: Kubernetes (for production)
- CI/CD: GitHub Actions or GitLab CI
- Monitoring: Prometheus, Grafana
- Logging: ELK Stack or CloudWatch

### System Architecture Flow

```
User UI → Application Layer → RAG Pipeline → Data Layer

RAG Pipeline Steps:
1. Document Ingestion
2. Text Extraction & Preprocessing
3. Chunking
4. Embedding Generation
5. Query Embedding
6. Semantic Search
7. Context Assembly
8. LLM Answer Generation
```

## Core Features

### 1. Natural Language Query Interface
Users ask questions like:
- "What are Tesla's main revenue drivers and growth outlook for 2024?"
- "Compare Apple's R&D spending to Microsoft and Google over the last 5 years"

Requirements:
- Web-based query interface with search bar
- Query history tracking
- Suggested/saved queries functionality
- Query refinement and follow-up questions

### 2. Document Management
Supported document types:
- SEC Filings (10-K, 10-Q, 8-K, Proxy Statements)
- Earnings Call Transcripts
- Analyst Reports
- Financial Statements
- Industry Research Reports
- News Articles and Press Releases

Requirements:
- Support PDF, DOCX, TXT, HTML formats
- Maximum file size: 50 MB per file
- Automatic document classification and metadata extraction
- Document organization by company/ticker symbol

### 3. Intelligent Document Retrieval
Technical approach:
- Semantic chunking (not just fixed-size chunks)
- Vector embeddings generation
- Context-aware retrieval (not just keyword matching)
- Chunk size: 512-1024 tokens with 50-100 token overlap

### 4. Answer Generation with Citations
Core functionality:
- Generate comprehensive answers based on retrieved content
- Include inline citations linking to source documents
- Display confidence scores for each citation
- Show exact page numbers and sections referenced

### 5. Cross-Document Analysis
Ability to:
- Compare metrics across different time periods
- Track changes in strategy or risk factors
- Identify contradictions or inconsistencies
- Correlate information across document types

### 6. Source Verification & Transparency
- Every claim must link back to source document
- Direct document viewing (inline PDF viewer)
- Highlight/scroll to exact referenced text in source
- Show retrieval context (surrounding text from chunk)

## Key Technical Components

### Document Processing Pipeline
```
Upload → Extract Text → Clean/Normalize → Chunk → Generate Embeddings → Store in Vector DB
```

### Query Processing Pipeline
```
User Query → Generate Query Embedding → Semantic Search →
Retrieve Top-K Chunks → Assemble Context → Send to LLM →
Generate Answer with Citations → Return to User
```

### Vector Database Schema
```json
{
  "id": "unique_chunk_id",
  "vector": [0.123, 0.456, ...],
  "metadata": {
    "document_id": "doc_123",
    "document_name": "Tesla_10K_2023.pdf",
    "company": "Tesla Inc",
    "ticker": "TSLA",
    "document_type": "10-K",
    "fiscal_year": 2023,
    "page_number": 45,
    "section": "Management Discussion & Analysis",
    "chunk_index": 12,
    "text": "Original text of the chunk..."
  }
}
```

## API Endpoints

### POST /api/documents/upload
Upload financial documents for processing
- Accepts: PDF, DOCX, TXT, HTML
- Returns: document_id, processing status

### GET /api/documents/{document_id}/status
Check document processing status
- Returns: status (queued/processing/completed/failed), progress, chunks_created

### POST /api/query
Submit natural language query
- Input: query text, optional filters (company, document_types, top_k)
- Returns: answer, citations, processing_time

### GET /api/documents
List all documents with optional filters
- Query params: company, type
- Returns: list of documents with metadata

### GET /api/documents/{document_id}
Get specific document details and download URL

## Development Guidelines

### Code Structure
```
rag-investment-intelligence/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/     # API route handlers
│   │   ├── core/              # Configuration, security, logging
│   │   ├── services/          # Business logic
│   │   │   ├── document_processor.py
│   │   │   ├── embedding_service.py
│   │   │   ├── vector_store.py
│   │   │   ├── llm_service.py
│   │   │   └── rag_pipeline.py
│   │   ├── models/            # Data models
│   │   └── utils/             # Utility functions
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── QueryInterface.jsx
│       │   ├── ResultsDisplay.jsx
│       │   ├── DocumentManager.jsx
│       │   └── SourceViewer.jsx
│       └── pages/
└── docs/
```

### Coding Standards
- **Python**: Follow PEP 8, use type hints
- **JavaScript/React**: Use ESLint with Airbnb style guide
- **Documentation**: Docstrings for all functions, README for each module
- **Git**: Conventional commits, feature branches, PR reviews
- **Testing**: Minimum 80% code coverage

### Key Implementation Details

**Chunking Strategy:**
- Chunk size: 512-1024 tokens (experiment to optimize)
- Overlap: 50-100 tokens between chunks
- Strategy: Semantic chunking to preserve paragraphs/sections
- Metadata: Store page number, section heading, document ID with each chunk

**Prompt Engineering:**
```python
PROMPT_TEMPLATE = """
You are an AI assistant helping investment analysts analyze financial documents.

Use the following context from investment documents to answer the user's question.
Always cite your sources using [Source N] notation.

Context from documents:
{context}

User Question: {question}

Instructions:
1. Provide a comprehensive answer based ONLY on the information in the context
2. Cite every claim using [Source N] format
3. If the context doesn't contain enough information, say so
4. Highlight any risks or caveats
5. Be precise with numbers and dates
6. Use clear, professional language
"""
```

## Known Challenges & Mitigation

### Challenge 1: Hallucination
**Problem**: LLM generating information not in source documents
**Mitigation**:
- Strict prompting: "Answer ONLY based on provided context"
- Citation requirement for every claim
- Confidence scoring
- Human review for low-confidence answers

### Challenge 2: Context Window Limitations
**Problem**: Cannot fit all relevant information in LLM context
**Mitigation**:
- Effective chunking strategy
- Retrieve most relevant chunks (not just most similar)
- Iterative refinement with follow-up queries
- Summary generation for long documents

### Challenge 3: Document Quality Variability
**Problem**: PDFs with poor formatting, scanned images, tables
**Mitigation**:
- OCR for scanned documents
- Table extraction libraries
- Manual review queue for problematic documents
- Document quality scoring

### Challenge 4: Ambiguous Queries
**Problem**: User queries that are too vague or broad
**Mitigation**:
- Query suggestions/auto-complete
- Ask clarifying questions
- Show related queries
- Query refinement UI

### Challenge 5: Outdated Information
**Problem**: Documents may be superseded by newer filings
**Mitigation**:
- Date-based filtering
- Show document version/date prominently
- Alert when newer documents are available
- Temporal query support ("as of Q2 2023...")

## Success Metrics (POC Phase)

### Primary Metrics
1. **Time Savings**: 50% reduction in research time (10 hours saved per analyst per week)
2. **Answer Accuracy**: 90%+ accuracy via expert review
3. **Source Attribution**: 100% of claims cited
4. **User Satisfaction**: 4.0+ out of 5.0

### Secondary Metrics
- Query response time: < 5 seconds target
- System uptime: 99%+ target
- Query success rate (non-empty answers)
- Citation click-through rate

## Security & Privacy

### Requirements
1. **Authentication & Authorization**: OAuth 2.0 or SAML, role-based access control
2. **Data Encryption**: Encryption at rest and in transit (TLS 1.3)
3. **Access Controls**: Document-level permissions, audit logging
4. **Data Privacy**: On-premise deployment option, data residency controls
5. **LLM Security**: Prompt injection protection, output filtering, rate limiting

## Implementation Phases

### Phase 1: Proof of Concept (9 Weeks)
**Week 1-2**: Data Preparation & Infrastructure Setup
**Week 3-5**: Core RAG Pipeline Development
**Week 6-8**: User Interface & Testing
**Week 9**: Evaluation & Refinement

### Phase 2: Production Development (Future)
- Enhanced UI/UX
- Advanced analytics dashboard
- Multi-user support with role-based access
- API for integrations
- Advanced features (comparative analysis, alerts)

## Environment Variables

```bash
# LLM Configuration
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=gpt-4-turbo-preview
LLM_TEMPERATURE=0.0

# Vector Database
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=investment-docs

# Document Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=rag-documents

# Database
DATABASE_URL=postgresql://user:pass@localhost/ragdb

# Application
SECRET_KEY=...
DEBUG=False
ALLOWED_HOSTS=localhost,api.example.com
```

## Test Cases

### Test Case 1: Simple Factual Query
- Query: "What was Tesla's total revenue in 2023?"
- Expected: Specific number with citation to 10-K
- Validation: Verify against actual 10-K

### Test Case 2: Cross-Document Synthesis
- Query: "Compare Tesla's revenue growth to Ford and GM"
- Expected: Multi-source answer with citations from each company
- Validation: Check all three companies cited

### Test Case 3: Complex Analysis
- Query: "What risks does Tesla identify related to supply chain?"
- Expected: Comprehensive list with citations to risk factors section
- Validation: Completeness vs manual review

### Test Case 4: No Answer Available
- Query: "What is Tesla's plan for Mars colonization?"
- Expected: "I don't have sufficient information..." message
- Validation: Proper handling of out-of-scope queries

## Quick Start for Development

```bash
# Clone repository
git clone https://github.com/yourorg/rag-investment-intel.git
cd rag-investment-intel

# Set up backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your API keys

# Run backend
uvicorn app.main:app --reload

# Set up frontend (in new terminal)
cd frontend
npm install
npm start
```

## Suggested Sample Documents for Testing

Include 3-5 companies with:
- At least one 10-K annual report
- At least one 10-Q quarterly report
- At least one earnings call transcript

Suggested companies:
- Tesla (automotive/tech)
- Apple (consumer tech)
- JPMorgan Chase (financial services)
- Johnson & Johnson (healthcare/pharma)
- ExxonMobil (energy)

## Important Context for AI Assistants

When working on this project:

1. **Prioritize citation accuracy**: Every factual claim must have a source
2. **Focus on semantic search**: Not just keyword matching
3. **Handle edge cases**: Poor quality PDFs, ambiguous queries, missing data
4. **Security first**: Prevent prompt injection, protect sensitive data
5. **User experience**: Fast response times, clear citations, intuitive UI
6. **Testing**: Validate with real financial documents and actual analyst workflows

## Resources

- [LangChain Documentation](https://python.langchain.com/)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Pinecone Documentation](https://docs.pinecone.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

## Glossary

- **RAG**: Retrieval-Augmented Generation - AI technique combining document retrieval with language generation
- **Embedding**: Vector representation of text that captures semantic meaning
- **Vector Database**: Database optimized for storing and searching high-dimensional vectors
- **Chunking**: Process of splitting documents into smaller, manageable pieces
- **Semantic Search**: Search based on meaning rather than exact keyword matching
- **10-K**: Annual report filed with SEC
- **10-Q**: Quarterly report filed with SEC
- **LLM**: Large Language Model (e.g., GPT-4, Claude)

---

*Last Updated: 2025-11-08*
*Status: POC Phase*
*Full project specification available in: /Docs/vision.md*

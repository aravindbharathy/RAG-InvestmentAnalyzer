import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.middleware';
import { initializeLanceDB } from './config/lancedb';
import documentRoutes from './routes/document.routes';
import queryRoutes from './routes/query.routes';
import companyRoutes from './routes/company.routes';
import './jobs/document-processor.worker';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (simple)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'RAG Investment Analyzer API is running',
    timestamp: new Date().toISOString(),
  });
});

// API Documentation
app.get('/rag-api', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RAG Investment Analyzer - API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }
    .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .header p { font-size: 1.1rem; opacity: 0.9; }
    .content { padding: 2rem; }
    .section {
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #eee;
    }
    .section:last-child { border-bottom: none; }
    .section h2 {
      color: #667eea;
      font-size: 1.8rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .endpoint {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      border-radius: 6px;
    }
    .method {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-weight: bold;
      font-size: 0.875rem;
      margin-right: 0.5rem;
    }
    .method.get { background: #28a745; color: white; }
    .method.post { background: #007bff; color: white; }
    .method.delete { background: #dc3545; color: white; }
    .path {
      font-family: 'Courier New', monospace;
      background: #2d3748;
      color: #68d391;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.9rem;
    }
    .description {
      margin-top: 0.75rem;
      color: #555;
      line-height: 1.6;
    }
    .params {
      margin-top: 1rem;
      background: white;
      padding: 1rem;
      border-radius: 4px;
      border: 1px solid #dee2e6;
    }
    .params h4 {
      color: #667eea;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .param {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    .param-name {
      font-family: 'Courier New', monospace;
      background: #edf2f7;
      padding: 0.125rem 0.5rem;
      border-radius: 3px;
      font-weight: 600;
      color: #2d3748;
    }
    .param-type {
      color: #718096;
      font-style: italic;
    }
    code {
      background: #2d3748;
      color: #68d391;
      padding: 0.125rem 0.375rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #ffd700;
      color: #333;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: bold;
      margin-left: 0.5rem;
    }
    .info-box {
      background: #e6f3ff;
      border-left: 4px solid #007bff;
      padding: 1rem;
      margin: 1.5rem 0;
      border-radius: 4px;
    }
    .info-box h4 {
      color: #007bff;
      margin-bottom: 0.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 RAG Investment Analyzer</h1>
      <p>API Documentation - v1.0.0</p>
    </div>

    <div class="content">
      <div class="info-box">
        <h4>📡 Base URL</h4>
        <p><code>http://localhost:${PORT}</code></p>
        <p style="margin-top: 0.5rem;">Environment: <strong>${process.env.NODE_ENV || 'development'}</strong> | LanceDB: <strong>Embedded</strong> | AI: <strong>Grok + OpenAI</strong></p>
      </div>

      <div class="section">
        <h2>🏥 Health & Status</h2>
        <div class="endpoint">
          <div>
            <span class="method get">GET</span>
            <span class="path">/health</span>
          </div>
          <div class="description">Check if the API server is running and healthy.</div>
          <div class="params">
            <h4>Response</h4>
            <p style="color: #555; font-size: 0.9rem;">Returns status, message, and timestamp.</p>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📄 Document Management</h2>

        <div class="endpoint">
          <div>
            <span class="method post">POST</span>
            <span class="path">/api/documents/upload</span>
            <span class="badge">Multipart</span>
          </div>
          <div class="description">
            Upload a document (PDF, DOCX, or TXT) for processing. The document will be chunked, embedded, and stored in the vector database.
          </div>
          <div class="params">
            <h4>Form Data</h4>
            <div class="param">
              <span class="param-name">file</span>
              <span class="param-type">(File, required)</span>
              <span>- Document file to upload</span>
            </div>
            <div class="param">
              <span class="param-name">companyTicker</span>
              <span class="param-type">(String, required)</span>
              <span>- Stock ticker symbol (e.g., AAPL, GOOGL)</span>
            </div>
            <div class="param">
              <span class="param-name">companyName</span>
              <span class="param-type">(String, optional)</span>
              <span>- Full company name</span>
            </div>
            <div class="param">
              <span class="param-name">documentType</span>
              <span class="param-type">(String, required)</span>
              <span>- Type: FILING_10K, FILING_10Q, FILING_8K, EARNINGS_TRANSCRIPT, etc.</span>
            </div>
            <div class="param">
              <span class="param-name">filingDate</span>
              <span class="param-type">(ISO Date, optional)</span>
              <span>- Document filing date</span>
            </div>
          </div>
        </div>

        <div class="endpoint">
          <div>
            <span class="method get">GET</span>
            <span class="path">/api/documents</span>
          </div>
          <div class="description">Get a list of all uploaded documents with their processing status.</div>
        </div>

        <div class="endpoint">
          <div>
            <span class="method get">GET</span>
            <span class="path">/api/documents/:id</span>
          </div>
          <div class="description">Get detailed information about a specific document, including chunks and metadata.</div>
        </div>

        <div class="endpoint">
          <div>
            <span class="method delete">DELETE</span>
            <span class="path">/api/documents/:id</span>
          </div>
          <div class="description">Delete a document and all its associated chunks from the database.</div>
        </div>
      </div>

      <div class="section">
        <h2>🔍 Query & Search</h2>

        <div class="endpoint">
          <div>
            <span class="method post">POST</span>
            <span class="path">/api/queries</span>
            <span class="badge">RAG</span>
          </div>
          <div class="description">
            Submit a natural language query. The system will search relevant document chunks and generate an AI-powered answer with citations.
          </div>
          <div class="params">
            <h4>Request Body (JSON)</h4>
            <div class="param">
              <span class="param-name">queryText</span>
              <span class="param-type">(String, required)</span>
              <span>- Natural language question</span>
            </div>
            <div class="param">
              <span class="param-name">companyFilter</span>
              <span class="param-type">(String, optional)</span>
              <span>- Filter by company ticker</span>
            </div>
            <div class="param">
              <span class="param-name">documentTypes</span>
              <span class="param-type">(Array, optional)</span>
              <span>- Filter by document types</span>
            </div>
            <div class="param">
              <span class="param-name">limit</span>
              <span class="param-type">(Number, optional)</span>
              <span>- Max chunks to retrieve (default: 5)</span>
            </div>
          </div>
        </div>

        <div class="endpoint">
          <div>
            <span class="method get">GET</span>
            <span class="path">/api/queries</span>
          </div>
          <div class="description">Get query history with answers and citations.</div>
        </div>

        <div class="endpoint">
          <div>
            <span class="method get">GET</span>
            <span class="path">/api/queries/:id</span>
          </div>
          <div class="description">Get detailed information about a specific query and its results.</div>
        </div>
      </div>

      <div class="section">
        <h2>🏢 Company Management</h2>

        <div class="endpoint">
          <div>
            <span class="method get">GET</span>
            <span class="path">/api/companies</span>
          </div>
          <div class="description">Get a list of all companies with document counts.</div>
        </div>

        <div class="endpoint">
          <div>
            <span class="method get">GET</span>
            <span class="path">/api/companies/:id</span>
          </div>
          <div class="description">Get detailed company information including all associated documents.</div>
        </div>
      </div>

      <div class="section">
        <h2>⚙️ Technology Stack</h2>
        <div class="params">
          <div class="param">
            <span class="param-name">Backend</span>
            <span>Express.js + TypeScript</span>
          </div>
          <div class="param">
            <span class="param-name">Database</span>
            <span>PostgreSQL (via Prisma ORM)</span>
          </div>
          <div class="param">
            <span class="param-name">Vector DB</span>
            <span>LanceDB (Embedded)</span>
          </div>
          <div class="param">
            <span class="param-name">LLM</span>
            <span>Grok (xAI) - grok-beta</span>
          </div>
          <div class="param">
            <span class="param-name">Embeddings</span>
            <span>OpenAI - text-embedding-3-large (1536 dims)</span>
          </div>
          <div class="param">
            <span class="param-name">Queue</span>
            <span>Bull + Redis (for background processing)</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `);
});

app.use('/api/documents', documentRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/companies', companyRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize and start server
async function startServer() {
  try {
    // Initialize LanceDB
    console.log('🔄 Initializing LanceDB...');
    await initializeLanceDB();

    // Start server
    app.listen(PORT, () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`🚀 RAG Investment Analyzer Backend`);
      console.log(`${'='.repeat(50)}`);
      console.log(`✓ Server running on: http://localhost:${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ LanceDB Path: ${process.env.LANCEDB_PATH || './lancedb_data'}`);
      console.log(`✓ Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
      console.log(`${'='.repeat(50)}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
startServer();

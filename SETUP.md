# RAG Investment Analyzer - Setup Guide (No Docker)

Simple setup guide for local development and EC2 deployment without Docker.

---

## Prerequisites

### Required Software

1. **Node.js** (v18.x or higher)
2. **npm** (comes with Node.js)
3. **PostgreSQL** (v14 or higher)
4. **Python** (v3.8+ for ChromaDB)
5. **Git**

---

## Step 1: Install Node.js

**Check if already installed:**
```bash
node --version
npm --version
```

### macOS (using Homebrew):
```bash
brew install node
```

### Ubuntu/Debian (EC2):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Verify:
```bash
node --version  # Should be v18.x.x or higher
npm --version
```

---

## Step 2: Install PostgreSQL

### macOS:
```bash
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb rag_investment_db
```

### Ubuntu/Debian (EC2):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE rag_investment_db;
CREATE USER raguser WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rag_investment_db TO raguser;
\q
EOF
```

### Verify:
```bash
psql -U postgres -c "SELECT version();"
```

---

## Step 3: Install Redis

### macOS:
```bash
brew install redis
brew services start redis
```

### Ubuntu/Debian (EC2):
```bash
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### Verify:
```bash
redis-cli ping
# Should return: PONG
```

---

## Step 4: Install Python & ChromaDB

### macOS/Ubuntu:
```bash
# Install Python 3 (if not already installed)
python3 --version

# Install pip
sudo apt install python3-pip  # Ubuntu
# or
brew install python3          # macOS

# Install ChromaDB
pip3 install chromadb
```

### Start ChromaDB Server:
```bash
# Create a directory for ChromaDB data
mkdir -p ~/chromadb_data

# Start ChromaDB server
chroma run --path ~/chromadb_data --port 8000
```

**Keep this running in a terminal or use a process manager (see below)**

### Verify:
```bash
curl http://localhost:8000/api/v1/heartbeat
# Should return heartbeat data
```

---

## Step 5: Clone/Initialize Project

```bash
cd /Users/aravind/Projects/RAG-InvestmentAnalyzer

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"
```

---

## Step 6: Set Up Backend

```bash
# Create backend directory
mkdir -p backend
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors dotenv prisma @prisma/client
npm install bull chromadb-client openai pdf-parse mammoth
npm install multer axios

# Install TypeScript and dev dependencies
npm install -D typescript @types/node @types/express ts-node nodemon
npm install -D @types/bull @types/multer @types/cors

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init
```

### Configure TypeScript (tsconfig.json):
The file is already created. Update it if needed:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Create package.json scripts:
Update `backend/package.json`:
```json
{
  "scripts": {
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio"
  }
}
```

---

## Step 7: Set Up Frontend

```bash
# Navigate back to root
cd ..

# Create Next.js app
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir --import-alias "@/*"

# Navigate to frontend
cd frontend

# Install additional dependencies
npm install axios react-pdf lucide-react
```

---

## Step 8: Configure Environment Variables

### Backend (.env)

Create `backend/.env`:
```bash
cd backend
touch .env
```

Add the following:
```env
# Database (adjust username/password if needed)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rag_investment_db"
# For Ubuntu/EC2 with custom user:
# DATABASE_URL="postgresql://raguser:your_password@localhost:5432/rag_investment_db"

# Redis
REDIS_URL="redis://localhost:6379"

# ChromaDB
CHROMA_URL="http://localhost:8000"

# OpenAI API Key (get from platform.openai.com)
OPENAI_API_KEY="sk-your-key-here"

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL="http://localhost:3000"

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR="./uploads"

# AWS S3 (optional - can use local storage for development)
# AWS_ACCESS_KEY_ID="your-key"
# AWS_SECRET_ACCESS_KEY="your-secret"
# AWS_REGION="us-east-1"
# AWS_S3_BUCKET="rag-documents"
```

### Frontend (.env.local)

Create `frontend/.env.local`:
```bash
cd ../frontend
touch .env.local
```

Add:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Step 9: Get OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create new secret key**
5. Copy the key and paste into `backend/.env`

**Initial cost:** ~$5 for testing (you can set spending limits)

---

## Step 10: Create Project Structure

```bash
cd backend

# Create directories
mkdir -p src/routes
mkdir -p src/services
mkdir -p src/jobs
mkdir -p src/middleware
mkdir -p src/config
mkdir -p src/utils
mkdir -p uploads

# Create basic files
touch src/server.ts
touch src/config/database.ts
touch src/config/redis.ts
touch src/config/chromadb.ts
```

---

## Step 11: Set Up Database Schema

The Prisma schema will be created in the next steps. For now, create a basic one:

Create/edit `backend/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Company {
  id        String   @id @default(uuid())
  name      String
  ticker    String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ticker])
}
```

### Run migration:
```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

---

## Running the Application

### Option 1: Multiple Terminals (Development)

**Terminal 1 - ChromaDB:**
```bash
chroma run --path ~/chromadb_data --port 8000
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

### Option 2: Using Process Manager (Production-like)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js` in project root:
```javascript
module.exports = {
  apps: [
    {
      name: 'chromadb',
      script: 'chroma',
      args: 'run --path ~/chromadb_data --port 8000',
      interpreter: 'none'
    },
    {
      name: 'backend',
      cwd: './backend',
      script: 'npm',
      args: 'run dev'
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev'
    }
  ]
}
```

Start all services:
```bash
pm2 start ecosystem.config.js
pm2 logs
```

---

## Verify Installation

### Check all services:

```bash
# PostgreSQL
psql -U postgres -d rag_investment_db -c "SELECT 1;"

# Redis
redis-cli ping

# ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Backend (once started)
curl http://localhost:3001/health

# Frontend
# Open browser: http://localhost:3000
```

---

## EC2 Deployment Notes

### Initial EC2 Setup (Ubuntu):

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Install Python and ChromaDB
sudo apt install python3 python3-pip
pip3 install chromadb

# Install Git
sudo apt install git

# Install PM2 (process manager)
sudo npm install -g pm2
```

### Clone and setup project:
```bash
git clone <your-repo-url>
cd RAG-InvestmentAnalyzer

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with production values
npx prisma migrate deploy
npx prisma generate

# Frontend setup
cd ../frontend
npm install
npm run build

# Start with PM2
cd ..
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Security Configuration (EC2):

1. **Firewall (UFW):**
```bash
sudo ufw allow 22        # SSH
sudo ufw allow 80        # HTTP
sudo ufw allow 443       # HTTPS
sudo ufw allow 3000      # Frontend (or use nginx proxy)
sudo ufw allow 3001      # Backend (or use nginx proxy)
sudo ufw enable
```

2. **Use nginx as reverse proxy (recommended):**
```bash
sudo apt install nginx

# Configure nginx to proxy to your apps
sudo nano /etc/nginx/sites-available/rag-app
```

---

## Quick Start Checklist

- [ ] Node.js v18+ installed
- [ ] PostgreSQL installed and running
- [ ] Redis installed and running
- [ ] Python 3 and ChromaDB installed
- [ ] ChromaDB server running (port 8000)
- [ ] Backend dependencies installed
- [ ] Frontend dependencies installed
- [ ] Database migrated with Prisma
- [ ] Environment variables configured
- [ ] OpenAI API key added
- [ ] Backend server starts (port 3001)
- [ ] Frontend server starts (port 3000)
- [ ] Can access http://localhost:3000

---

## Common Issues

### Issue 1: PostgreSQL Connection Error

**Error:** `Can't connect to PostgreSQL`

**Solution:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start if not running
sudo systemctl start postgresql

# Check DATABASE_URL in .env matches your setup
```

### Issue 2: Redis Connection Error

**Error:** `Redis connection refused`

**Solution:**
```bash
# Check if Redis is running
sudo systemctl status redis-server

# Start if not running
sudo systemctl start redis-server
```

### Issue 3: ChromaDB Not Starting

**Error:** `Cannot connect to ChromaDB`

**Solution:**
```bash
# Make sure port 8000 is not in use
lsof -i :8000

# Start ChromaDB in background
nohup chroma run --path ~/chromadb_data --port 8000 > chromadb.log 2>&1 &
```

### Issue 4: Port Already in Use

**Error:** `Port 3000/3001 already in use`

**Solution:**
```bash
# Find process using the port
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

---

## Development Costs

| Service | Cost |
|---------|------|
| PostgreSQL | Free (self-hosted) |
| Redis | Free (self-hosted) |
| ChromaDB | Free (self-hosted) |
| OpenAI API | ~$5-10/month (development) |
| **Total** | **$5-10/month** |

### EC2 Costs (Production):
- t3.medium (4GB RAM): ~$30/month
- Storage (20GB): ~$2/month
- **Total**: ~$32-40/month + OpenAI usage

---

## Next Steps

1. ✅ Complete this setup
2. 📖 Read [Docs/architecture.md](./Docs/architecture.md)
3. 🔨 Start building (backend first, then frontend)
4. 📝 Refer to [Docs/vision.md](./Docs/vision.md) for features

---

**Ready to code!** 🚀

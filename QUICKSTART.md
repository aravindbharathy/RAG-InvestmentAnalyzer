# Quick Start Guide - Installation Summary

This is a condensed version for experienced developers. For detailed instructions, see [SETUP.md](./SETUP.md).

## 📦 What You Need to Install

### 1. Core Software
```bash
# macOS
brew install node postgresql@15 redis python3
pip3 install chromadb

# Ubuntu/Debian (EC2)
sudo apt update
sudo apt install nodejs postgresql postgresql-contrib redis-server python3 python3-pip
pip3 install chromadb
```

### 2. Start Services
```bash
# PostgreSQL (should auto-start)
brew services start postgresql@15  # macOS
sudo systemctl start postgresql    # Linux

# Redis (should auto-start)
brew services start redis           # macOS
sudo systemctl start redis-server  # Linux

# ChromaDB (manual start)
mkdir -p ~/chromadb_data
chroma run --path ~/chromadb_data --port 8000
```

### 3. Create Database
```bash
# macOS
createdb rag_investment_db

# Ubuntu (as postgres user)
sudo -u postgres createdb rag_investment_db
```

---

## 🚀 Project Setup

### Backend
```bash
cd backend

# Install dependencies
npm install express cors dotenv prisma @prisma/client bull chromadb-client openai pdf-parse mammoth multer axios
npm install -D typescript @types/node @types/express ts-node nodemon @types/bull @types/multer @types/cors

# Setup
npx tsc --init
npx prisma init

# Create .env file
cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rag_investment_db"
REDIS_URL="redis://localhost:6379"
CHROMA_URL="http://localhost:8000"
OPENAI_API_KEY="sk-your-key-here"
PORT=3001
NODE_ENV=development
FRONTEND_URL="http://localhost:3000"
MAX_FILE_SIZE=52428800
UPLOAD_DIR="./uploads"
EOF

# Create directories
mkdir -p src/{routes,services,jobs,middleware,config,utils} uploads
touch src/server.ts

# Initialize database
npx prisma migrate dev --name init
npx prisma generate
```

### Frontend
```bash
cd ../frontend

# Create Next.js app (interactive prompts)
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"

# Install additional dependencies
npm install axios react-pdf lucide-react

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

---

## ▶️ Running the Application

### Option 1: Multiple Terminals
```bash
# Terminal 1
chroma run --path ~/chromadb_data --port 8000

# Terminal 2
cd backend && npm run dev

# Terminal 3
cd frontend && npm run dev
```

### Option 2: PM2 Process Manager
```bash
# Install PM2
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# View logs
pm2 logs

# Stop all
pm2 delete all
```

---

## ✅ Verify Everything Works

```bash
# PostgreSQL
psql -U postgres -d rag_investment_db -c "SELECT 1;"

# Redis
redis-cli ping

# ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Backend (after starting)
curl http://localhost:3001/health

# Frontend (after starting)
# Open: http://localhost:3000
```

---

## 🔑 Get OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up/login
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy and paste into `backend/.env` as `OPENAI_API_KEY`

**Cost:** ~$5 for development/testing

---

## 📝 Next Steps

1. ✅ Complete installation above
2. 📖 Read architecture: `Docs/architecture.md`
3. 🔨 Start coding!

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| PostgreSQL won't start | `brew services restart postgresql@15` or `sudo systemctl restart postgresql` |
| Redis connection error | `brew services restart redis` or `sudo systemctl restart redis-server` |
| Port 3000 in use | `lsof -i :3000` then `kill -9 <PID>` |
| ChromaDB won't start | Make sure port 8000 is free: `lsof -i :8000` |
| Prisma errors | Check `DATABASE_URL` in `.env` |

---

## 💻 EC2 Quick Deploy

```bash
# On fresh Ubuntu EC2 instance
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql redis-server python3-pip git
pip3 install chromadb
sudo npm install -g pm2

# Clone and setup
git clone <your-repo>
cd RAG-InvestmentAnalyzer
cd backend && npm install && npx prisma migrate deploy
cd ../frontend && npm install && npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

---

**Need more details?** See [SETUP.md](./SETUP.md) for complete step-by-step instructions.

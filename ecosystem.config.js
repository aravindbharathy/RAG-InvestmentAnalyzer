// PM2 Process Manager Configuration
// Usage: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    // ChromaDB Vector Database
    {
      name: 'chromadb',
      script: 'chroma',
      args: 'run --path ~/chromadb_data --port 8000',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development'
      },
      error_file: './logs/chromadb-error.log',
      out_file: './logs/chromadb-out.log',
      time: true
    },

    // Express.js Backend API
    {
      name: 'backend',
      cwd: './backend',
      script: 'npm',
      args: 'run dev',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: '../logs/backend-error.log',
      out_file: '../logs/backend-out.log',
      time: true
    },

    // Next.js Frontend
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'run dev',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      error_file: '../logs/frontend-error.log',
      out_file: '../logs/frontend-out.log',
      time: true
    }
  ]
};

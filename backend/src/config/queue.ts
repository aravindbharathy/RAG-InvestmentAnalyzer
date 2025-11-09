import Queue from 'bull';
import redis from './redis';

// Create document processing queue
export const documentQueue = new Queue('document-processing', {
  redis: {
    host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
    port: parseInt(process.env.REDIS_URL?.split(':')[2] || '6379'),
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500,     // Keep last 500 failed jobs
  },
});

// Event handlers
documentQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

documentQueue.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

documentQueue.on('error', (error) => {
  console.error('Queue error:', error);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await documentQueue.close();
});

export default documentQueue;

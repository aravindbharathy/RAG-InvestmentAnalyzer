import { Job } from 'bull';
import { documentQueue } from '../config/queue';
import { processDocument } from '../services/document.service';

export interface DocumentProcessJob {
  documentId: string;
}

// Process documents in the queue
documentQueue.process(async (job: Job<DocumentProcessJob>) => {
  const { documentId } = job.data;

  console.log(`🔄 Processing job ${job.id} for document ${documentId}`);

  try {
    await processDocument(documentId);
    return { success: true, documentId };
  } catch (error) {
    console.error(`Failed to process document ${documentId}:`, error);
    throw error;
  }
});

console.log('📡 Document processor worker started');

export default documentQueue;

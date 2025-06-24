/**
 * BullMQ Queue Definitions
 * Archive and File processing queues
 */

import { Queue } from 'bullmq';
import { redisConnection } from './redis';

// Job data interfaces
export interface ArchiveJobData {
  zipPath: string;
  originalName: string;
  sessionId: string;
  mimeType?: string;
  size?: number;
}

export interface FileJobData {
  fileContent: string;
  filename: string;
  zipSource: string;
  sessionId: string;
  archiveJobId: string;
}

// Queue options
const queueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
  },
};

// Archive Queue - Processes ZIP files
export const archiveQueue = new Queue<ArchiveJobData>('archive-processing', queueOptions);

// File Queue - Processes individual files from ZIP extraction
export const fileQueue = new Queue<FileJobData>('file-processing', queueOptions);

// Queue event handlers will be handled by workers

// Queue management functions
export async function addArchiveJob(data: ArchiveJobData, priority?: number): Promise<string> {
  const job = await archiveQueue.add('process-archive', data, {
    priority: priority || 0,
    delay: 0,
  });
  
  console.log(`📦 Archive job added: ${job.id} - ${data.originalName}`);
  return job.id || '';
}

export async function addFileJob(data: FileJobData, priority?: number): Promise<string> {
  const job = await fileQueue.add('process-file', data, {
    priority: priority || 0,
    delay: 0,
  });
  
  console.log(`📄 File job added: ${job.id} - ${data.filename}`);
  return job.id || '';
}

// Queue status functions
export async function getArchiveQueueStatus() {
  const [waiting, active, completed, failed] = await Promise.all([
    archiveQueue.getWaiting(),
    archiveQueue.getActive(),
    archiveQueue.getCompleted(),
    archiveQueue.getFailed(),
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  };
}

export async function getFileQueueStatus() {
  const [waiting, active, completed, failed] = await Promise.all([
    fileQueue.getWaiting(),
    fileQueue.getActive(),
    fileQueue.getCompleted(),
    fileQueue.getFailed(),
  ]);

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  };
}

// Graceful shutdown
export async function closeQueues(): Promise<void> {
  await Promise.all([
    archiveQueue.close(),
    fileQueue.close(),
  ]);
  console.log('📦 All queues closed');
}
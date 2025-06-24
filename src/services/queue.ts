/**
 * BullMQ Queue Service
 * Archive and File processing queues with Redis
 */

import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Redis connection
const redisConnection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
};

export interface ArchiveJobData {
  zipPath: string;
  originalName: string;
  sessionId: string;
  sourceId?: number;
  mimeType?: string;
  size?: number;
}

export interface FileJobData {
  fileContent: string;
  filename: string;
  zipSource: string;
  sessionId: string;
  archiveJobId: string;
  sourceId?: number;
}

// Queue instances
export const archiveQueue = new Queue<ArchiveJobData>('archive-processing', queueOptions);
export const fileQueue = new Queue<FileJobData>('file-processing', queueOptions);

// Queue management functions
export async function addArchiveJob(data: ArchiveJobData, priority?: number): Promise<string> {
  const job = await archiveQueue.add('process-archive', data, {
    priority: priority || 0,
  });
  
  logger.info(`Archive job added: ${job.id} - ${data.originalName}`);
  return job.id!;
}

export async function addFileJob(data: FileJobData, priority?: number): Promise<string> {
  const job = await fileQueue.add('process-file', data, {
    priority: priority || 0,
  });
  
  logger.debug(`File job added: ${job.id} - ${data.filename}`);
  return job.id!;
}

export async function getArchiveQueueStatus() {
  const waiting = await archiveQueue.getWaiting();
  const active = await archiveQueue.getActive();
  const completed = await archiveQueue.getCompleted();
  const failed = await archiveQueue.getFailed();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  };
}

export async function getFileQueueStatus() {
  const waiting = await fileQueue.getWaiting();
  const active = await fileQueue.getActive();
  const completed = await fileQueue.getCompleted();
  const failed = await fileQueue.getFailed();

  return {
    waiting: waiting.length,
    active: active.length,
    completed: completed.length,
    failed: failed.length,
  };
}

export async function closeQueues(): Promise<void> {
  await Promise.all([
    archiveQueue.close(),
    fileQueue.close(),
    redisConnection.quit(),
  ]);
  logger.info('Queues closed');
}

// Health check for Redis connection
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redisConnection.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}
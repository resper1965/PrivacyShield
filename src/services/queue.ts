/**
 * BullMQ Queue Service
 * Archive and File processing queues with Redis
 */

import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { 
  addArchiveJobFallback, 
  addFileJobFallback, 
  getArchiveQueueStatusFallback, 
  getFileQueueStatusFallback 
} from './fallbackQueue';

// Redis connection
const redisConnection = new IORedis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
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

let redisAvailable = false;

// Check Redis availability
async function checkRedisAvailability(): Promise<boolean> {
  try {
    await redisConnection.ping();
    redisAvailable = true;
    logger.info('Redis connection established');
    return true;
  } catch (error) {
    redisAvailable = false;
    logger.warn('Redis unavailable, using fallback queue:', error);
    return false;
  }
}

// Initialize Redis check
checkRedisAvailability();

// Queue management functions with fallback
export async function addArchiveJob(data: ArchiveJobData, priority?: number): Promise<string> {
  if (!redisAvailable) {
    return addArchiveJobFallback(data);
  }

  try {
    const job = await archiveQueue.add('process-archive', data, {
      priority: priority || 0,
    });
    
    logger.info(`Archive job added: ${job.id} - ${data.originalName}`);
    return job.id!;
  } catch (error) {
    logger.warn('Redis archive job failed, using fallback:', error);
    return addArchiveJobFallback(data);
  }
}

export async function addFileJob(data: FileJobData, priority?: number): Promise<string> {
  if (!redisAvailable) {
    return addFileJobFallback(data);
  }

  try {
    const job = await fileQueue.add('process-file', data, {
      priority: priority || 0,
    });
    
    logger.debug(`File job added: ${job.id} - ${data.filename}`);
    return job.id!;
  } catch (error) {
    logger.warn('Redis file job failed, using fallback:', error);
    return addFileJobFallback(data);
  }
}

export async function getArchiveQueueStatus() {
  if (!redisAvailable) {
    return getArchiveQueueStatusFallback();
  }

  try {
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
  } catch (error) {
    logger.warn('Redis queue status failed, using fallback:', error);
    return getArchiveQueueStatusFallback();
  }
}

export async function getFileQueueStatus() {
  if (!redisAvailable) {
    return getFileQueueStatusFallback();
  }

  try {
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
  } catch (error) {
    logger.warn('Redis queue status failed, using fallback:', error);
    return getFileQueueStatusFallback();
  }
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
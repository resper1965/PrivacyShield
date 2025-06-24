/**
 * Fallback Queue Service
 * Simple in-memory queue when Redis is unavailable
 */

import { logger } from '../utils/logger';
import { ArchiveJobData, FileJobData } from './queue';

interface QueueJob<T = any> {
  id: string;
  data: T;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

class FallbackQueue<T = any> {
  private jobs: Map<string, QueueJob<T>> = new Map();
  private waitingJobs: string[] = [];
  private activeJobs: string[] = [];
  private completedJobs: string[] = [];
  private failedJobs: string[] = [];

  add(name: string, data: T): string {
    const id = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: QueueJob<T> = {
      id,
      data,
      status: 'waiting',
      createdAt: new Date(),
    };

    this.jobs.set(id, job);
    this.waitingJobs.push(id);
    
    logger.info(`Fallback queue job added: ${id}`);
    return id;
  }

  getStatus() {
    return {
      waiting: this.waitingJobs.length,
      active: this.activeJobs.length,
      completed: this.completedJobs.length,
      failed: this.failedJobs.length,
    };
  }

  processNext(): QueueJob<T> | null {
    if (this.waitingJobs.length === 0) return null;

    const jobId = this.waitingJobs.shift()!;
    const job = this.jobs.get(jobId);
    
    if (job) {
      job.status = 'active';
      this.activeJobs.push(jobId);
      this.moveFromArray(this.waitingJobs, this.activeJobs, jobId);
    }

    return job || null;
  }

  complete(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.completedAt = new Date();
      this.moveFromArray(this.activeJobs, this.completedJobs, jobId);
    }
  }

  fail(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error;
      job.completedAt = new Date();
      this.moveFromArray(this.activeJobs, this.failedJobs, jobId);
    }
  }

  private moveFromArray(from: string[], to: string[], jobId: string): void {
    const index = from.indexOf(jobId);
    if (index > -1) {
      from.splice(index, 1);
      to.push(jobId);
    }
  }
}

// Fallback queue instances
export const fallbackArchiveQueue = new FallbackQueue<ArchiveJobData>();
export const fallbackFileQueue = new FallbackQueue<FileJobData>();

export async function addArchiveJobFallback(data: ArchiveJobData): Promise<string> {
  return fallbackArchiveQueue.add('process-archive', data);
}

export async function addFileJobFallback(data: FileJobData): Promise<string> {
  return fallbackFileQueue.add('process-file', data);
}

export async function getArchiveQueueStatusFallback() {
  return fallbackArchiveQueue.getStatus();
}

export async function getFileQueueStatusFallback() {
  return fallbackFileQueue.getStatus();
}
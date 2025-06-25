/**
 * Archive Worker
 * Processes ZIP files and creates file processing jobs
 */

import { Worker, Job } from 'bullmq';
import * as fs from 'fs-extra';
import { PrismaClient } from '@prisma/client';
import { ArchiveJobData, FileJobData, addFileJob } from '../services/queue';
import { extractZipFiles, validateZipFile } from '../services/zipService';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { triggerN8nIncident } from '../services/n8nService';

const prisma = new PrismaClient();

export const archiveWorker = new Worker<ArchiveJobData>(
  'archive-processing',
  async (job: Job<ArchiveJobData>) => {
    const { zipPath, originalName, sessionId, sourceId, mimeType, size } = job.data;
    
    logger.info(`Processing archive: ${originalName} (Session: ${sessionId})`);
    
    try {
      // Step 1: Validate ZIP file
      const isValid = await validateZipFile(zipPath);
      if (!isValid) {
        throw new Error('ZIP file validation failed');
      }

      // Step 2: Create file record in database
      const fileRecord = await prisma.file.create({
        data: {
          filename: originalName,
          originalName,
          zipSource: originalName,
          mimeType,
          size,
          sessionId,
          sourceId,
        },
      });

      // Step 3: Extract ZIP contents
      const extractionResult = await extractZipFiles(zipPath);
      
      // Step 4: Update file record with extraction stats
      await prisma.file.update({
        where: { id: fileRecord.id },
        data: {
          totalFiles: extractionResult.totalFiles,
        },
      });

      // Step 5: Create file processing jobs for each extracted file
      const fileJobs: Promise<string>[] = [];
      
      for (const extractedFile of extractionResult.files) {
        const fileJobData: FileJobData = {
          fileContent: extractedFile.content,
          filename: extractedFile.filename,
          zipSource: originalName,
          sessionId,
          archiveJobId: job.id!,
          sourceId,
        };
        
        fileJobs.push(addFileJob(fileJobData));
      }

      // Wait for all file jobs to be queued
      const queuedJobIds = await Promise.all(fileJobs);
      
      logger.info(`Archive processed: ${originalName} - ${extractionResult.totalFiles} files queued`);
      
      // Step 6: Clean up ZIP file
      try {
        if (await fs.pathExists(zipPath)) {
          await fs.remove(zipPath);
          logger.debug(`Cleaned up ZIP file: ${zipPath}`);
        }
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup ZIP file: ${zipPath}`, cleanupError);
      }

      // Step 6: Trigger n8n incident workflow after successful processing
      try {
        const webhookResult = await triggerN8nIncident(fileRecord.id.toString());
        if (webhookResult.success) {
          logger.info(`N8N incident workflow triggered for file ${fileRecord.id}`);
        } else {
          logger.warn(`Failed to trigger N8N workflow: ${webhookResult.error}`);
        }
      } catch (webhookError) {
        // Don't fail the entire job if webhook fails
        logger.error(`N8N webhook error for file ${fileRecord.id}:`, webhookError);
      }

      return {
        fileId: fileRecord.id,
        totalFiles: extractionResult.totalFiles,
        queuedJobs: queuedJobIds.length,
        extractionStats: {
          totalUncompressedSize: extractionResult.totalUncompressedSize,
          totalCompressedSize: extractionResult.totalCompressedSize,
          overallCompressionRatio: extractionResult.overallCompressionRatio,
        },
        n8nTriggered: true,
      };
      
    } catch (error) {
      logger.error(`Archive processing failed: ${originalName}`, error);
      
      // Clean up ZIP file even on error
      try {
        if (await fs.pathExists(zipPath)) {
          await fs.remove(zipPath);
        }
      } catch (cleanupError) {
        logger.warn(`Failed to cleanup ZIP file on error: ${zipPath}`, cleanupError);
      }
      
      throw error;
    }
  },
  {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
    concurrency: 1, // Process one archive at a time
  }
);

// Event handlers
archiveWorker.on('completed', (job, result) => {
  logger.info(`Archive job completed: ${job.id} - ${job.data.originalName} (${result.totalFiles} files)`);
});

archiveWorker.on('failed', (job, err) => {
  logger.error(`Archive job failed: ${job?.id} - ${job?.data?.originalName}`, err);
});

archiveWorker.on('error', (err) => {
  logger.error('Archive worker error:', err);
});

export default archiveWorker;
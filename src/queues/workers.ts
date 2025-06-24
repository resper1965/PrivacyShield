/**
 * BullMQ Workers
 * Archive and File processing workers
 */

import { Worker, Job } from 'bullmq';
import { redisConnection } from './redis';
import { ArchiveJobData, FileJobData, addFileJob } from './queues';
import { extractZipFiles } from '../zipExtractor';
import { detectPIIInText } from '../detectPII';
import { piiRepository } from '../repository';
import { virusScanner } from '../virusScanner';
import * as path from 'path';
import * as fs from 'fs-extra';

// Worker options
const workerOptions = {
  connection: redisConnection,
  concurrency: 3,
  removeOnComplete: 50,
  removeOnFail: 100,
};

/**
 * Archive Worker - Processes ZIP files
 */
export const archiveWorker = new Worker<ArchiveJobData>(
  'archive-processing',
  async (job: Job<ArchiveJobData>) => {
    const { zipPath, originalName, sessionId, mimeType, size } = job.data;
    
    console.log(`📦 Processing archive: ${originalName} (Session: ${sessionId})`);
    
    try {
      // Step 1: Virus scan
      console.log(`🔍 Virus scanning: ${originalName}`);
      const scanResult = await virusScanner.scanFile(zipPath);
      
      if (scanResult.isInfected) {
        throw new Error(`Archive infected with viruses: ${scanResult.viruses.join(', ')}`);
      }
      
      // Step 2: Extract ZIP files
      console.log(`📂 Extracting ZIP: ${originalName}`);
      const extractionResult = await extractZipFiles(zipPath);
      
      // Step 3: Create file record in database
      const fileRecord = await piiRepository.createFile({
        filename: originalName,
        originalName: originalName,
        zipSource: originalName,
        mimeType: mimeType,
        size: size,
        sessionId: sessionId,
        totalFiles: extractionResult.totalFiles,
      });
      
      // Step 4: Queue individual files for processing
      const fileJobs: Promise<string>[] = [];
      
      for (const extractedFile of extractionResult.files) {
        const fileJobData: FileJobData = {
          fileContent: extractedFile.content,
          filename: extractedFile.filename,
          zipSource: originalName,
          sessionId: sessionId,
          archiveJobId: job.id || '',
        };
        
        fileJobs.push(addFileJob(fileJobData));
      }
      
      // Wait for all file jobs to be queued
      const queuedJobIds = await Promise.all(fileJobs);
      
      console.log(`✅ Archive processed: ${originalName} - ${extractionResult.totalFiles} files queued`);
      
      return {
        fileId: fileRecord.id,
        totalFiles: extractionResult.totalFiles,
        queuedJobs: queuedJobIds.length,
        extractionResult: {
          totalFiles: extractionResult.totalFiles,
          totalUncompressedSize: extractionResult.totalUncompressedSize,
          totalCompressedSize: extractionResult.totalCompressedSize,
          overallCompressionRatio: extractionResult.overallCompressionRatio,
        },
      };
      
    } catch (error) {
      console.error(`❌ Archive processing failed: ${originalName}`, error);
      throw error;
    } finally {
      // Clean up ZIP file
      try {
        if (await fs.pathExists(zipPath)) {
          await fs.remove(zipPath);
          console.log(`🗑️ Cleaned up ZIP file: ${zipPath}`);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup ZIP file: ${zipPath}`, cleanupError);
      }
    }
  },
  workerOptions
);

/**
 * File Worker - Processes individual files from ZIP extraction
 */
export const fileWorker = new Worker<FileJobData>(
  'file-processing',
  async (job: Job<FileJobData>) => {
    const { fileContent, filename, zipSource, sessionId } = job.data;
    
    console.log(`📄 Processing file: ${filename} from ${zipSource}`);
    
    try {
      // Detect PII in file content
      const detections = detectPIIInText(fileContent, filename, zipSource);
      
      if (detections.length > 0) {
        // Find the corresponding file record
        const fileRecords = await piiRepository.getFiles({ 
          includeDetections: false 
        });
        
        const fileRecord = fileRecords.find(f => 
          f.sessionId === sessionId && f.zipSource === zipSource
        );
        
        if (fileRecord) {
          // Save detections to database
          await piiRepository.createDetections(detections, fileRecord.id);
          console.log(`✅ File processed: ${filename} - ${detections.length} PII detections saved`);
        } else {
          console.warn(`⚠️ File record not found for session: ${sessionId}, zipSource: ${zipSource}`);
        }
      } else {
        console.log(`✅ File processed: ${filename} - No PII detected`);
      }
      
      return {
        filename,
        detectionsCount: detections.length,
        detections: detections.map(d => ({
          tipo: d.documento,
          valor: d.valor,
          titular: d.titular,
        })),
      };
      
    } catch (error) {
      console.error(`❌ File processing failed: ${filename}`, error);
      throw error;
    }
  },
  workerOptions
);

// Worker event handlers
archiveWorker.on('completed', (job: Job<ArchiveJobData>, result: any) => {
  console.log(`📦 Archive job completed: ${job.id} - ${job.data.originalName} (${result.totalFiles} files)`);
});

archiveWorker.on('failed', (job: Job<ArchiveJobData> | undefined, err: Error) => {
  console.error(`❌ Archive job failed: ${job?.id} - ${job?.data.originalName}`, err.message);
});

fileWorker.on('completed', (job: Job<FileJobData>, result: any) => {
  console.log(`📄 File job completed: ${job.id} - ${job.data.filename} (${result.detectionsCount} detections)`);
});

fileWorker.on('failed', (job: Job<FileJobData> | undefined, err: Error) => {
  console.error(`❌ File job failed: ${job?.id} - ${job?.data.filename}`, err.message);
});

// Graceful shutdown
export async function closeWorkers(): Promise<void> {
  await Promise.all([
    archiveWorker.close(),
    fileWorker.close(),
  ]);
  console.log('🔧 All workers closed');
}

// Worker status
export function getWorkersStatus() {
  return {
    archiveWorker: {
      isRunning: archiveWorker.isRunning(),
      isClosed: archiveWorker.isClosed(),
    },
    fileWorker: {
      isRunning: fileWorker.isRunning(),
      isClosed: fileWorker.isClosed(),
    },
  };
}
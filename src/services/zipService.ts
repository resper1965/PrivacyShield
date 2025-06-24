/**
 * ZIP Service
 * Secure ZIP file extraction with zip-bomb protection
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yauzl from 'yauzl';
import { logger } from '../utils/logger';

export interface ExtractedFile {
  filename: string;
  content: string;
  size: number;
  compressedSize: number;
  compressionRatio: number;
}

export interface ExtractionResult {
  files: ExtractedFile[];
  totalFiles: number;
  totalUncompressedSize: number;
  totalCompressedSize: number;
  overallCompressionRatio: number;
}

// Security limits
const MAX_COMPRESSION_RATIO = 100; // 100:1 ratio limit
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file
const MAX_FILES = 1000; // Maximum files in ZIP
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total uncompressed

/**
 * Validates if a path is safe (prevents directory traversal)
 */
function isPathSafe(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return !normalized.includes('..') && !path.isAbsolute(normalized);
}

/**
 * Calculates compression ratio and validates against limits
 */
function validateCompressionRatio(uncompressedSize: number, compressedSize: number): boolean {
  if (compressedSize === 0) return false;
  const ratio = uncompressedSize / compressedSize;
  return ratio <= MAX_COMPRESSION_RATIO;
}

/**
 * Extracts ZIP file with security validations
 */
export async function extractZipFiles(zipPath: string): Promise<ExtractionResult> {
  logger.info(`Starting ZIP extraction: ${zipPath}`);

  return new Promise((resolve, reject) => {
    const extractedFiles: ExtractedFile[] = [];
    let totalUncompressedSize = 0;
    let totalCompressedSize = 0;
    let fileCount = 0;

    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        logger.error(`Failed to open ZIP file: ${err.message}`);
        return reject(new Error(`Failed to open ZIP file: ${err.message}`));
      }

      if (!zipfile) {
        return reject(new Error('Invalid ZIP file'));
      }

      zipfile.readEntry();

      zipfile.on('entry', (entry: yauzl.Entry) => {
        // Skip directories
        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }

        // Validate file count limit
        if (fileCount >= MAX_FILES) {
          logger.warn(`Maximum file count exceeded: ${MAX_FILES}`);
          return reject(new Error(`ZIP contains too many files (max: ${MAX_FILES})`));
        }

        // Validate path safety
        if (!isPathSafe(entry.fileName)) {
          logger.warn(`Unsafe file path detected: ${entry.fileName}`);
          return reject(new Error(`Unsafe file path: ${entry.fileName}`));
        }

        // Validate file size
        if (entry.uncompressedSize > MAX_FILE_SIZE) {
          logger.warn(`File too large: ${entry.fileName} (${entry.uncompressedSize} bytes)`);
          return reject(new Error(`File too large: ${entry.fileName}`));
        }

        // Validate compression ratio
        if (!validateCompressionRatio(entry.uncompressedSize, entry.compressedSize)) {
          logger.warn(`Suspicious compression ratio: ${entry.fileName}`);
          return reject(new Error(`Suspicious compression ratio: ${entry.fileName}`));
        }

        // Validate total size
        if (totalUncompressedSize + entry.uncompressedSize > MAX_TOTAL_SIZE) {
          logger.warn(`Total uncompressed size limit exceeded`);
          return reject(new Error('Total uncompressed size limit exceeded'));
        }

        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) {
            logger.error(`Failed to read entry ${entry.fileName}: ${err.message}`);
            return reject(new Error(`Failed to read entry: ${entry.fileName}`));
          }

          if (!readStream) {
            zipfile.readEntry();
            return;
          }

          const chunks: Buffer[] = [];
          let bytesRead = 0;

          readStream.on('data', (chunk: Buffer) => {
            bytesRead += chunk.length;
            
            // Additional safety check during reading
            if (bytesRead > MAX_FILE_SIZE) {
              readStream.destroy();
              return reject(new Error(`File size limit exceeded during reading: ${entry.fileName}`));
            }
            
            chunks.push(chunk);
          });

          readStream.on('error', (error: Error) => {
            logger.error(`Stream error for ${entry.fileName}: ${error.message}`);
            reject(new Error(`Failed to read file: ${entry.fileName}`));
          });

          readStream.on('end', () => {
            try {
              const content = Buffer.concat(chunks).toString('utf-8');
              const compressionRatio = entry.uncompressedSize / entry.compressedSize;

              extractedFiles.push({
                filename: entry.fileName,
                content,
                size: entry.uncompressedSize,
                compressedSize: entry.compressedSize,
                compressionRatio
              });

              totalUncompressedSize += entry.uncompressedSize;
              totalCompressedSize += entry.compressedSize;
              fileCount++;

              logger.debug(`Extracted file: ${entry.fileName} (${entry.uncompressedSize} bytes)`);
              zipfile.readEntry();

            } catch (error) {
              logger.error(`Failed to process content for ${entry.fileName}: ${error}`);
              reject(new Error(`Failed to process file content: ${entry.fileName}`));
            }
          });
        });
      });

      zipfile.on('end', () => {
        const overallCompressionRatio = totalCompressedSize > 0 ? totalUncompressedSize / totalCompressedSize : 0;

        const result: ExtractionResult = {
          files: extractedFiles,
          totalFiles: fileCount,
          totalUncompressedSize,
          totalCompressedSize,
          overallCompressionRatio
        };

        logger.info(`ZIP extraction completed: ${fileCount} files, ${totalUncompressedSize} bytes total`);
        resolve(result);
      });

      zipfile.on('error', (error: Error) => {
        logger.error(`ZIP file error: ${error.message}`);
        reject(new Error(`ZIP processing error: ${error.message}`));
      });
    });
  });
}

/**
 * Validates ZIP file before extraction
 */
export async function validateZipFile(zipPath: string): Promise<boolean> {
  try {
    await fs.access(zipPath);
    const stats = await fs.stat(zipPath);
    
    // Basic file size check
    if (stats.size > 100 * 1024 * 1024) { // 100MB ZIP limit
      logger.warn(`ZIP file too large: ${stats.size} bytes`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error(`ZIP validation failed: ${error}`);
    return false;
  }
}
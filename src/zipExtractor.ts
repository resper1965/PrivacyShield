/**
 * ZIP Extractor Module
 * Secure ZIP file extraction with traversal protection and compression ratio limits
 */

import * as unzipper from 'unzipper';
import * as path from 'path';
import * as fs from 'fs-extra';

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

export interface ExtractionError {
  error: string;
  message: string;
  details?: {
    filename?: string;
    compressionRatio?: number;
    maxRatio?: number;
  };
}

/**
 * Maximum compression ratio allowed (uncompressed / compressed)
 */
const MAX_COMPRESSION_RATIO = 100;

/**
 * Maximum file size allowed (100MB)
 */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Maximum number of files in ZIP
 */
const MAX_FILES_COUNT = 1000;

/**
 * Validates if a path is safe (prevents directory traversal)
 */
function isPathSafe(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);
  
  // Check for directory traversal patterns
  if (normalizedPath.includes('..') || 
      normalizedPath.startsWith('/') || 
      normalizedPath.includes('\0') ||
      /^[a-zA-Z]:\\/.test(normalizedPath)) {
    return false;
  }
  
  return true;
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
  try {
    // Verify ZIP file exists
    if (!await fs.pathExists(zipPath)) {
      throw new Error(`ZIP file not found: ${zipPath}`);
    }

    const extractedFiles: ExtractedFile[] = [];
    let totalUncompressedSize = 0;
    let totalCompressedSize = 0;
    let fileCount = 0;

    // Create readable stream from ZIP file
    const zipStream = fs.createReadStream(zipPath);
    
    return new Promise<ExtractionResult>((resolve, reject) => {
      zipStream
        .pipe(unzipper.Parse())
        .on('entry', async (entry: unzipper.Entry) => {
          const fileName = entry.path;
          const type = entry.type;
          const compressedSize = entry.vars.compressedSize || 0;

          try {
            // Skip directories
            if (type === 'Directory') {
              entry.autodrain();
              return;
            }

            // Validate file count limit
            fileCount++;
            if (fileCount > MAX_FILES_COUNT) {
              entry.autodrain();
              return reject(new Error(`Too many files in ZIP. Maximum allowed: ${MAX_FILES_COUNT}`));
            }

            // Validate path safety (prevent traversal)
            if (!isPathSafe(fileName)) {
              entry.autodrain();
              return reject(new Error(`Unsafe file path detected: ${fileName}`));
            }

            // Validate file size
            if (size > MAX_FILE_SIZE) {
              entry.autodrain();
              return reject(new Error(`File too large: ${fileName} (${size} bytes). Maximum: ${MAX_FILE_SIZE} bytes`));
            }

            // Validate compression ratio
            if (!validateCompressionRatio(size, compressedSize)) {
              const ratio = compressedSize > 0 ? size / compressedSize : Infinity;
              entry.autodrain();
              return reject(new Error(
                `Compression ratio too high for file: ${fileName} (${ratio.toFixed(2)}x). Maximum allowed: ${MAX_COMPRESSION_RATIO}x`
              ));
            }

            // Read file content
            const chunks: Buffer[] = [];
            entry.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            });

            entry.on('end', () => {
              try {
                const buffer = Buffer.concat(chunks);
                const content = buffer.toString('utf8');
                const actualSize = buffer.length;

                // Validate actual vs declared size
                if (actualSize !== size && size > 0) {
                  console.warn(`Size mismatch for ${fileName}: declared ${size}, actual ${actualSize}`);
                }

                // Calculate compression ratio with actual size
                const compressionRatio = compressedSize > 0 ? actualSize / compressedSize : 1;

                extractedFiles.push({
                  filename: fileName,
                  content: content,
                  size: actualSize,
                  compressedSize: compressedSize,
                  compressionRatio: compressionRatio
                });

                totalUncompressedSize += actualSize;
                totalCompressedSize += compressedSize;
              } catch (error) {
                console.error(`Error processing file ${fileName}:`, error);
              }
            });

            entry.on('error', (error: Error) => {
              console.error(`Error reading file ${fileName}:`, error);
              reject(new Error(`Failed to read file ${fileName}: ${error.message}`));
            });

          } catch (error) {
            entry.autodrain();
            reject(error);
          }
        })
        .on('finish', () => {
          // Validate overall compression ratio
          const overallRatio = totalCompressedSize > 0 ? totalUncompressedSize / totalCompressedSize : 1;
          
          if (overallRatio > MAX_COMPRESSION_RATIO) {
            return reject(new Error(
              `Overall compression ratio too high: ${overallRatio.toFixed(2)}x. Maximum allowed: ${MAX_COMPRESSION_RATIO}x`
            ));
          }

          const result: ExtractionResult = {
            files: extractedFiles,
            totalFiles: extractedFiles.length,
            totalUncompressedSize,
            totalCompressedSize,
            overallCompressionRatio: overallRatio
          };

          resolve(result);
        })
        .on('error', (error: Error) => {
          reject(new Error(`ZIP extraction failed: ${error.message}`));
        });
    });

  } catch (error) {
    throw new Error(`ZIP extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validates ZIP file before extraction
 */
export async function validateZipFile(zipPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(zipPath);
    
    // Check file size (max 50MB for ZIP file itself)
    const maxZipSize = 50 * 1024 * 1024;
    if (stats.size > maxZipSize) {
      throw new Error(`ZIP file too large: ${stats.size} bytes. Maximum: ${maxZipSize} bytes`);
    }

    return true;
  } catch (error) {
    throw new Error(`ZIP validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
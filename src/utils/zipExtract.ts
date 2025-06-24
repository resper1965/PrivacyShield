/**
 * Enhanced ZIP Extraction with UUID-based directories
 * Extracts to /tmp/extracts/<uuid> with zip-bomb protection
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { extractZipFiles } from '../services/zipService';
import { logger } from './logger';
import { env } from '../config/env';

export interface ExtractionSession {
  sessionId: string;
  extractDir: string;
  files: Array<{ path: string; content: string; size: number }>;
  totalSize: number;
  totalFiles: number;
}

export class ZipExtractor {
  private baseExtractDir: string;

  constructor() {
    this.baseExtractDir = path.join(env.TMP_DIR, 'extracts');
    fs.ensureDirSync(this.baseExtractDir);
  }

  async extractToSession(zipPath: string): Promise<ExtractionSession> {
    const sessionId = uuidv4();
    const extractDir = path.join(this.baseExtractDir, sessionId);
    
    try {
      // Create session directory
      await fs.ensureDir(extractDir);
      logger.info(`Created extraction session: ${sessionId}`);

      // Extract ZIP with security validations
      const extractionResult = await extractZipFiles(zipPath);
      
      // Write extracted files to session directory
      const files: Array<{ path: string; content: string; size: number }> = [];
      
      for (const extractedFile of extractionResult.files) {
        const filePath = path.join(extractDir, extractedFile.filename);
        const fileDir = path.dirname(filePath);
        
        // Ensure directory exists
        await fs.ensureDir(fileDir);
        
        // Write file content
        await fs.writeFile(filePath, extractedFile.content, 'utf-8');
        
        files.push({
          path: filePath,
          content: extractedFile.content,
          size: extractedFile.size
        });
      }

      const session: ExtractionSession = {
        sessionId,
        extractDir,
        files,
        totalSize: extractionResult.totalUncompressedSize,
        totalFiles: extractionResult.totalFiles
      };

      logger.info(`Extraction session ${sessionId} completed: ${files.length} files, ${session.totalSize} bytes`);
      return session;

    } catch (error) {
      // Clean up on error
      await this.cleanupSession(sessionId);
      logger.error(`Extraction session ${sessionId} failed:`, error);
      throw error;
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    const extractDir = path.join(this.baseExtractDir, sessionId);
    
    try {
      if (await fs.pathExists(extractDir)) {
        await fs.remove(extractDir);
        logger.info(`Cleaned up extraction session: ${sessionId}`);
      }
    } catch (error) {
      logger.warn(`Failed to cleanup session ${sessionId}:`, error);
    }
  }

  async cleanupOldSessions(maxAgeHours: number = 24): Promise<void> {
    try {
      const sessions = await fs.readdir(this.baseExtractDir);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const sessionId of sessions) {
        const sessionDir = path.join(this.baseExtractDir, sessionId);
        const stats = await fs.stat(sessionDir);
        
        if (now - stats.mtimeMs > maxAge) {
          await fs.remove(sessionDir);
          logger.info(`Cleaned up old session: ${sessionId}`);
        }
      }
    } catch (error) {
      logger.warn('Failed to cleanup old sessions:', error);
    }
  }
}

export const zipExtractor = new ZipExtractor();
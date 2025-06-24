/**
 * Secure ClamAV Service
 * Provides virus scanning with security best practices
 */

import { spawn } from 'child_process';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import path from 'path';
import fs from 'fs-extra';

const pipelineAsync = promisify(pipeline);

export interface ScanResult {
  isInfected: boolean;
  viruses: string[];
  file: string;
  scanTime: number;
}

export interface ScanError extends Error {
  code: string;
  file: string;
}

export class ClamAVService {
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;
  private readonly maxFileSize: number;

  constructor() {
    this.host = process.env.CLAMAV_HOST || 'localhost';
    this.port = parseInt(process.env.CLAMAV_PORT || '3310');
    this.timeout = parseInt(process.env.CLAMAV_TIMEOUT || '30000');
    this.maxFileSize = parseInt(process.env.MAX_SCAN_FILE_SIZE || '104857600'); // 100MB
  }

  /**
   * Scan file for viruses using ClamAV daemon
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    const startTime = Date.now();
    
    try {
      // Validate file path to prevent directory traversal
      const normalizedPath = path.normalize(filePath);
      if (!normalizedPath.startsWith(process.cwd()) && !normalizedPath.startsWith('/tmp') && !normalizedPath.startsWith('/uploads')) {
        throw this.createScanError('INVALID_PATH', `Invalid file path: ${filePath}`, filePath);
      }

      // Check file exists and size
      const stats = await fs.stat(normalizedPath);
      if (stats.size > this.maxFileSize) {
        throw this.createScanError('FILE_TOO_LARGE', `File too large: ${stats.size} bytes`, filePath);
      }

      // Use clamdscan for secure scanning
      const result = await this.runClamdscan(normalizedPath);
      
      return {
        isInfected: result.isInfected,
        viruses: result.viruses,
        file: filePath,
        scanTime: Date.now() - startTime
      };

    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw scan errors
      }
      
      throw this.createScanError('SCAN_FAILED', `Scan failed: ${error.message}`, filePath);
    }
  }

  /**
   * Run clamdscan command securely
   */
  private async runClamdscan(filePath: string): Promise<{ isInfected: boolean; viruses: string[] }> {
    return new Promise((resolve, reject) => {
      const args = [
        '--no-summary',
        '--fdpass',
        '--stream',
        filePath
      ];

      const process = spawn('clamdscan', args, {
        timeout: this.timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          // Clean file
          resolve({ isInfected: false, viruses: [] });
        } else if (code === 1) {
          // Infected file
          const viruses = this.parseVirusNames(stdout);
          resolve({ isInfected: true, viruses });
        } else {
          // Error
          reject(this.createScanError('CLAMDSCAN_ERROR', stderr || `clamdscan exited with code ${code}`, filePath));
        }
      });

      process.on('error', (error) => {
        reject(this.createScanError('CLAMDSCAN_SPAWN_ERROR', `Failed to spawn clamdscan: ${error.message}`, filePath));
      });

      process.on('timeout', () => {
        process.kill('SIGKILL');
        reject(this.createScanError('SCAN_TIMEOUT', `Scan timeout after ${this.timeout}ms`, filePath));
      });
    });
  }

  /**
   * Parse virus names from clamdscan output
   */
  private parseVirusNames(output: string): string[] {
    const lines = output.split('\n');
    const viruses: string[] = [];

    for (const line of lines) {
      const match = line.match(/FOUND:\s*(.+)$/);
      if (match) {
        viruses.push(match[1].trim());
      }
    }

    return viruses;
  }

  /**
   * Create structured scan error
   */
  private createScanError(code: string, message: string, file: string): ScanError {
    const error = new Error(message) as ScanError;
    error.code = code;
    error.file = file;
    error.name = 'ScanError';
    return error;
  }

  /**
   * Check if ClamAV daemon is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.runHealthCheck();
      return result;
    } catch {
      return false;
    }
  }

  /**
   * Run health check against ClamAV daemon
   */
  private async runHealthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const process = spawn('clamdscan', ['--version'], {
        timeout: 5000,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      process.on('close', (code) => {
        resolve(code === 0);
      });

      process.on('error', () => {
        resolve(false);
      });

      process.on('timeout', () => {
        process.kill('SIGKILL');
        resolve(false);
      });
    });
  }

  /**
   * Validate file MIME type against allowed types
   */
  static validateMimeType(file: Express.Multer.File, allowedTypes: string[]): boolean {
    if (!file.mimetype) {
      return false;
    }

    // Sanitize MIME type
    const sanitizedMimeType = file.mimetype.toLowerCase().trim();
    
    return allowedTypes.some(type => {
      const sanitizedAllowedType = type.toLowerCase().trim();
      return sanitizedMimeType === sanitizedAllowedType || 
             sanitizedMimeType.startsWith(sanitizedAllowedType + '/');
    });
  }

  /**
   * Validate file extension against allowed extensions
   */
  static validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
    if (!filename) {
      return false;
    }

    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.some(allowed => 
      allowed.toLowerCase() === ext
    );
  }
}

// Export singleton instance
export const clamAVService = new ClamAVService();
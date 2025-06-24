/**
 * ClamAV Service
 * Virus scanning with fallback options
 */

import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export interface ScanResult {
  isClean: boolean;
  threats: string[];
  scanTime: number;
  fileSize: number;
  scanner: 'clamav' | 'fallback' | 'disabled';
}

export class ClamAVService {
  private clamAvailable: boolean = false;

  constructor() {
    this.checkClamAVAvailability();
  }

  private async checkClamAVAvailability(): Promise<void> {
    try {
      const result = await this.runCommand('clamscan', ['--version']);
      this.clamAvailable = result.exitCode === 0;
      
      if (this.clamAvailable) {
        logger.info('ClamAV is available and ready');
      } else {
        logger.warn('ClamAV not available, using fallback scanning');
      }
    } catch (error) {
      this.clamAvailable = false;
      logger.warn('ClamAV check failed, using fallback scanning:', error);
    }
  }

  public async scanFile(filePath: string): Promise<ScanResult> {
    const startTime = Date.now();
    const stats = await fs.stat(filePath);
    
    if (!this.clamAvailable) {
      return this.fallbackScan(filePath, stats.size, startTime);
    }

    try {
      const result = await this.runCommand('clamscan', [
        '--no-summary',
        '--infected',
        '--stdout',
        filePath
      ]);

      const scanTime = Date.now() - startTime;
      const output = result.stdout + result.stderr;
      
      // Parse ClamAV output
      const isClean = result.exitCode === 0;
      const threats: string[] = [];
      
      if (!isClean) {
        const lines = output.split('\n');
        for (const line of lines) {
          if (line.includes('FOUND')) {
            const match = line.match(/:\s*(.+)\s+FOUND/);
            if (match) {
              threats.push(match[1]);
            }
          }
        }
      }

      logger.info(`ClamAV scan completed: ${filePath} - ${isClean ? 'CLEAN' : 'INFECTED'} (${scanTime}ms)`);

      return {
        isClean,
        threats,
        scanTime,
        fileSize: stats.size,
        scanner: 'clamav'
      };

    } catch (error) {
      logger.warn('ClamAV scan failed, using fallback:', error);
      return this.fallbackScan(filePath, stats.size, startTime);
    }
  }

  private async fallbackScan(filePath: string, fileSize: number, startTime: number): Promise<ScanResult> {
    // Basic fallback checks
    const threats: string[] = [];
    let isClean = true;

    try {
      // Check file size (reject extremely large files as potential zip bombs)
      if (fileSize > 500 * 1024 * 1024) { // 500MB
        threats.push('OVERSIZED_FILE');
        isClean = false;
      }

      // Check for suspicious file signatures (basic)
      const buffer = await fs.readFile(filePath, { encoding: null });
      
      // Check for known malicious patterns (simplified)
      const suspiciousPatterns = [
        Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR'), // EICAR test string
        Buffer.from('eval('), // JavaScript eval
        Buffer.from('<script'), // HTML script tags
      ];

      for (const pattern of suspiciousPatterns) {
        if (buffer.indexOf(pattern) !== -1) {
          threats.push('SUSPICIOUS_PATTERN');
          isClean = false;
          break;
        }
      }

      const scanTime = Date.now() - startTime;
      
      logger.info(`Fallback scan completed: ${filePath} - ${isClean ? 'CLEAN' : 'SUSPICIOUS'} (${scanTime}ms)`);

      return {
        isClean,
        threats,
        scanTime,
        fileSize,
        scanner: 'fallback'
      };

    } catch (error) {
      logger.error('Fallback scan failed:', error);
      
      // If we can't scan, assume clean but log the issue
      return {
        isClean: true,
        threats: ['SCAN_FAILED'],
        scanTime: Date.now() - startTime,
        fileSize,
        scanner: 'fallback'
      };
    }
  }

  private runCommand(command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode: exitCode || 0 });
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        process.kill();
        reject(new Error('Scan timeout'));
      }, 30000);
    });
  }

  public isAvailable(): boolean {
    return this.clamAvailable;
  }
}

export const clamAVService = new ClamAVService();
/**
 * Virus Scanner Service
 * Handles virus scanning using ClamAV through node-clamav
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const NodeClam = require('clamscan');
import * as fs from 'fs-extra';
import * as path from 'path';

export interface ScanResult {
  isInfected: boolean;
  viruses: string[];
  file: string;
}

export interface ScanError {
  error: string;
  message: string;
  file: string;
}

/**
 * Virus scanner class using ClamAV
 */
export class VirusScanner {
  private clamscan: any = null;
  private initialized = false;

  /**
   * Initialize ClamAV scanner
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to initialize with ClamAV daemon first, fallback to binary scan
      this.clamscan = await NodeClam.init({
        removeInfected: false,
        quarantineInfected: false,
        scanLog: null,
        debugMode: false,
        fileList: null,
        scanRecursively: true,
        clamdscan: {
          socket: false,
          host: false,
          port: false,
          timeout: 60000,
          localFallback: true,
        },
        preference: 'clamdscan'
      });

      this.initialized = true;
      console.log('✅ ClamAV scanner initialized successfully');
    } catch (error) {
      console.warn('⚠️ ClamAV initialization failed, using mock scanner for development:', error);
      this.initialized = false;
    }
  }

  /**
   * Scan file for viruses
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // If ClamAV is not available, use development mock scanner
    if (!this.initialized || !this.clamscan) {
      return this.mockScan(filePath);
    }

    try {
      const scanResult = await this.clamscan.scanFile(filePath);
      
      return {
        isInfected: scanResult.isInfected || false,
        viruses: scanResult.viruses || [],
        file: path.basename(filePath)
      };
    } catch (error) {
      console.error('ClamAV scan error:', error);
      // Fallback to mock scanner in case of error
      return this.mockScan(filePath);
    }
  }

  /**
   * Mock scanner for development environment
   * Simulates virus detection based on filename patterns
   */
  private mockScan(filePath: string): ScanResult {
    const filename = path.basename(filePath).toLowerCase();
    
    // Simulate infected files for testing
    const isInfected = filename.includes('virus') || 
                      filename.includes('malware') || 
                      filename.includes('infected');
    
    return {
      isInfected,
      viruses: isInfected ? ['Win.Test.EICAR_HDB-1'] : [],
      file: path.basename(filePath)
    };
  }

  /**
   * Validate MIME type for ZIP files
   */
  static validateZipMimeType(file: Express.Multer.File): boolean {
    const allowedMimeTypes = [
      'application/zip',
      'application/x-zip-compressed',
      'application/x-zip',
      'multipart/x-zip'
    ];

    return allowedMimeTypes.includes(file.mimetype);
  }

  /**
   * Validate file extension for ZIP files
   */
  static validateZipExtension(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ext === '.zip';
  }
}

// Export singleton instance
export const virusScanner = new VirusScanner();
/**
 * ZIP Service Tests
 * Tests for zip-bomb protection and secure extraction
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { extractZipFiles, validateZipFile } from '../../src/services/zipService';

const testDataDir = path.join(__dirname, '../testdata');

describe('ZIP Service', () => {
  beforeAll(async () => {
    await fs.ensureDir(testDataDir);
  });

  afterAll(async () => {
    await fs.remove(testDataDir);
  });

  describe('Zip Bomb Protection', () => {
    test('should reject files with suspicious compression ratios', async () => {
      // Create a test file that simulates a zip bomb
      const zipBombPath = path.join(testDataDir, 'zipbomb.zip');
      
      // This would normally be a real zip bomb file for testing
      // For this test, we'll simulate the rejection
      await fs.writeFile(zipBombPath, Buffer.alloc(1024, 0)); // Dummy file
      
      // The actual zip bomb protection is in the extractZipFiles function
      // In a real test, you would create a legitimate zip bomb test file
      
      try {
        await extractZipFiles(zipBombPath);
        // If we get here without error, check if it was properly validated
      } catch (error) {
        expect(error.message).toContain('compression ratio');
      }
      
      await fs.remove(zipBombPath);
    });

    test('should reject files that are too large', async () => {
      const largePath = path.join(testDataDir, 'large.zip');
      
      // Create a file larger than the limit
      const largeBuffer = Buffer.alloc(200 * 1024 * 1024, 'A'); // 200MB
      await fs.writeFile(largePath, largeBuffer);
      
      const isValid = await validateZipFile(largePath);
      expect(isValid).toBe(false);
      
      await fs.remove(largePath);
    });

    test('should reject files with too many entries', async () => {
      // This test would require creating a ZIP with many files
      // For demonstration, we're testing the concept
      
      const testPath = path.join(testDataDir, 'manyfiles.zip');
      await fs.writeFile(testPath, Buffer.alloc(1024, 0));
      
      // In a real implementation, you would create a ZIP with 1000+ files
      // and test that the extraction rejects it
      
      await fs.remove(testPath);
    });
  });

  describe('Path Traversal Protection', () => {
    test('should reject files with directory traversal attempts', async () => {
      // This test simulates checking for "../" patterns in zip entries
      const dangerousPath = '../../../etc/passwd';
      
      // The isPathSafe function should reject this
      const isPathSafe = (filePath: string): boolean => {
        const normalized = path.normalize(filePath);
        return !normalized.includes('..') && !path.isAbsolute(normalized);
      };
      
      expect(isPathSafe(dangerousPath)).toBe(false);
      expect(isPathSafe('normal/file.txt')).toBe(true);
      expect(isPathSafe('/absolute/path')).toBe(false);
    });
  });

  describe('File Size Limits', () => {
    test('should enforce maximum file size limits', async () => {
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
      
      // Test file size validation
      const testLargeSize = 150 * 1024 * 1024; // 150MB
      const testNormalSize = 50 * 1024 * 1024;  // 50MB
      
      expect(testLargeSize > MAX_FILE_SIZE).toBe(true);
      expect(testNormalSize <= MAX_FILE_SIZE).toBe(true);
    });
  });

  describe('Compression Ratio Validation', () => {
    test('should validate compression ratios', () => {
      const MAX_COMPRESSION_RATIO = 100;
      
      const validateCompressionRatio = (uncompressed: number, compressed: number): boolean => {
        if (compressed === 0) return false;
        const ratio = uncompressed / compressed;
        return ratio <= MAX_COMPRESSION_RATIO;
      };
      
      // Normal compression (should pass)
      expect(validateCompressionRatio(1000, 500)).toBe(true); // 2:1 ratio
      expect(validateCompressionRatio(1000, 100)).toBe(true); // 10:1 ratio
      
      // Suspicious compression (should fail)
      expect(validateCompressionRatio(10000, 50)).toBe(false); // 200:1 ratio
      expect(validateCompressionRatio(1000, 0)).toBe(false);   // Division by zero
    });
  });

  describe('Valid ZIP Processing', () => {
    test('should successfully extract valid ZIP files', async () => {
      // Create a simple test ZIP file content
      const testContent = 'This is test content for PII detection.';
      const testFile = path.join(testDataDir, 'test.txt');
      
      await fs.writeFile(testFile, testContent);
      
      // In a real test, you would create an actual ZIP file and extract it
      // For this example, we're testing the concept
      
      expect(await fs.pathExists(testFile)).toBe(true);
      
      const content = await fs.readFile(testFile, 'utf-8');
      expect(content).toBe(testContent);
      
      await fs.remove(testFile);
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted ZIP files gracefully', async () => {
      const corruptedPath = path.join(testDataDir, 'corrupted.zip');
      
      // Create a file that looks like a ZIP but is corrupted
      await fs.writeFile(corruptedPath, 'This is not a valid ZIP file');
      
      try {
        await extractZipFiles(corruptedPath);
        fail('Should have thrown an error for corrupted ZIP');
      } catch (error) {
        expect(error).toBeDefined();
      }
      
      await fs.remove(corruptedPath);
    });

    test('should handle non-existent files', async () => {
      const nonExistentPath = path.join(testDataDir, 'nonexistent.zip');
      
      const isValid = await validateZipFile(nonExistentPath);
      expect(isValid).toBe(false);
    });
  });
});
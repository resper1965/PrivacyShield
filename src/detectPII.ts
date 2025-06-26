/**
 * PII Detection Module
 * Detects CPF, CNPJ, Email, and Phone patterns in text with Brazilian standards
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { PIIDetection, DetectionSession } from './types/pii';
import { detectPIIInText } from './services/processor';

export type { PIIDetection, DetectionSession } from './types/pii';

/**
 * Process ZIP extraction and save detections
 */
export async function processZipExtractionAndSave(
  zipPath: string,
  originalName: string
): Promise<DetectionSession> {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  try {
    // Extract ZIP files
    const extractedFiles = await extractZipFiles(zipPath);
    
    // Process each file for PII detection
    const allDetections: PIIDetection[] = [];
    
    for (const file of extractedFiles) {
      const detections = detectPIIInText(file.content, file.filename, originalName);
      allDetections.push(...detections);
    }

    const processingTime = Date.now() - startTime;

    // Create detection session
    const session: DetectionSession = {
      sessionId,
      zipFile: originalName,
      totalFiles: extractedFiles.length,
      totalSize: extractedFiles.reduce((sum, file) => sum + file.content.length, 0),
      detections: allDetections,
      processingTime,
      createdAt: new Date()
    };

    // Save to database or file system
    await saveDetectionSession(session);

    return session;

  } catch (error) {
    console.error('Error processing ZIP extraction:', error);
    throw error;
  }
}

/**
 * Save detection session to storage
 */
export async function saveDetectionSession(session: DetectionSession): Promise<void> {
  const detectionsFile = path.join(process.cwd(), 'detections.json');
  
  try {
    // Read existing detections
    let existingDetections: DetectionSession[] = [];
    if (await fs.pathExists(detectionsFile)) {
      const content = await fs.readFile(detectionsFile, 'utf-8');
      existingDetections = JSON.parse(content);
    }

    // Add new session
    existingDetections.push(session);

    // Write back to file
    await fs.writeFile(detectionsFile, JSON.stringify(existingDetections, null, 2));
    
    console.log(`Detection session saved: ${session.sessionId} with ${session.detections.length} detections`);
  } catch (error) {
    console.error('Error saving detection session:', error);
    throw error;
  }
}

/**
 * Helper function to extract ZIP files
 */
async function extractZipFiles(zipPath: string): Promise<Array<{ content: string; filename: string }>> {
  // This would use the zipExtractor service
  // For now, return empty array as placeholder
  return [];
}

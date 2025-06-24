/**
 * PII Detection Module
 * Detects CPF, CNPJ, Email, and Phone patterns in text with Brazilian standards
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { PIIDetection, detectPIIInText } from './services/processor';
export type { PIIDetection } from './services/processor';
export { detectPIIInText } from './services/processor';

export interface DetectionSession {
  sessionId: string;
  timestamp: string;
  zipFile: string;
  totalFiles: number;
  totalDetections: number;
  detections: PIIDetection[];
}

/**
 * Process multiple files and detect PII from ZIP extraction
 */
export function detectPIIInFiles(files: Array<{ content: string; filename: string }>, zipSource: string = 'unknown'): PIIDetection[] {
  const allDetections: PIIDetection[] = [];

  for (const file of files) {
    const detections = detectPIIInText(file.content, file.filename, zipSource);
    allDetections.push(...detections);
  }

  return allDetections;
}

/**
 * Saves detection session to detections.json (append mode)
 */
export async function saveDetectionSession(session: DetectionSession): Promise<void> {
  const detectionsFilePath = path.join(process.cwd(), 'detections.json');
  
  try {
    let existingData: DetectionSession[] = [];
    
    // Read existing detections if file exists
    if (await fs.pathExists(detectionsFilePath)) {
      const fileContent = await fs.readFile(detectionsFilePath, 'utf8');
      if (fileContent.trim()) {
        existingData = JSON.parse(fileContent);
      }
    }
    
    // Append new session
    existingData.push(session);
    
    // Write back to file
    await fs.writeFile(detectionsFilePath, JSON.stringify(existingData, null, 2), 'utf8');
    
    console.log(`💾 Detection session saved: ${session.totalDetections} detections from ${session.zipFile}`);
  } catch (error) {
    console.error('❌ Error saving detection session:', error);
    throw new Error(`Failed to save detection session: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process ZIP extraction result and save detections
 */
export async function processZipExtractionAndSave(
  files: Array<{ content: string; filename: string }>, 
  zipFileName: string
): Promise<PIIDetection[]> {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Detect PII in all extracted files
  const allDetections = detectPIIInFiles(files, zipFileName);
  
  // Create detection session
  const session: DetectionSession = {
    sessionId,
    timestamp,
    zipFile: zipFileName,
    totalFiles: files.length,
    totalDetections: allDetections.length,
    detections: allDetections
  };
  
  // Save to detections.json
  await saveDetectionSession(session);
  
  return allDetections;
}

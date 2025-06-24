/**
 * PII Detection Module
 * Detects CPF, CNPJ, Email, and Phone patterns in text with Brazilian standards
 */

import * as fs from 'fs-extra';
import * as path from 'path';

export interface PIIDetection {
  titular: string;
  documento: 'CPF' | 'CNPJ' | 'Email' | 'Telefone';
  valor: string;
  arquivo: string;
  timestamp: string;
  zipSource: string;
}

export interface DetectionSession {
  sessionId: string;
  timestamp: string;
  zipFile: string;
  totalFiles: number;
  totalDetections: number;
  detections: PIIDetection[];
}

/**
 * Enhanced Brazilian PII patterns with improved accuracy
 */
const PII_PATTERNS = {
  // CPF: Supports all Brazilian CPF formats
  // 123.456.789-10, 12345678910, 123 456 789 10
  CPF: /\b(?:\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})\b/g,
  
  // CNPJ: All Brazilian CNPJ formats
  // 12.345.678/0001-90, 12345678000190, 12 345 678 0001 90
  CNPJ: /\b(?:\d{2}[.\s]?\d{3}[.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2})\b/g,
  
  // Email: Comprehensive email pattern with Brazilian domains
  Email: /\b[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\b/g,
  
  // Brazilian phone numbers: Mobile and landline
  // +55 11 99999-9999, (11) 99999-9999, 11999999999, +5511999999999
  Telefone: /\b(?:\+?55\s?)?(?:\(?(?:0?[1-9]{2})\)?\s?)?(?:9?\d{4}[-\s]?\d{4})\b/g
};

/**
 * Validates CPF using Brazilian algorithm
 */
function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(10))) return false;

  return true;
}

/**
 * Validates CNPJ using Brazilian algorithm
 */
function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }

  // First verification digit
  let sum = 0;
  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * firstWeights[i]!;
  }
  let remainder = sum % 11;
  let firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (firstDigit !== parseInt(cleanCNPJ.charAt(12))) return false;

  // Second verification digit
  sum = 0;
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * secondWeights[i]!;
  }
  remainder = sum % 11;
  let secondDigit = remainder < 2 ? 0 : 11 - remainder;
  if (secondDigit !== parseInt(cleanCNPJ.charAt(13))) return false;

  return true;
}

/**
 * Enhanced phone number validation for Brazilian standards
 */
function isValidBrazilianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Valid lengths: 10 (landline) or 11 (mobile) digits
  // With country code: 12 (landline) or 13 (mobile) digits
  if (cleanPhone.length < 10 || cleanPhone.length > 13) {
    return false;
  }
  
  // Check if starts with country code +55
  if (cleanPhone.length >= 12 && !cleanPhone.startsWith('55')) {
    return false;
  }
  
  return true;
}

/**
 * Determines titular (data subject) from context
 */
function extractTitular(text: string, detection: string): string {
  const lines = text.split('\n');
  const detectionLine = lines.find(line => line.includes(detection));
  
  if (!detectionLine) return '(código desconhecido)';
  
  // Simple heuristics to find associated name
  const namePatterns = [
    /Nome:\s*([A-ZÁÊÍÓÚÂÃÕÇ\s]+)/i,
    /Titular:\s*([A-ZÁÊÍÓÚÂÃÕÇ\s]+)/i,
    /Proprietário:\s*([A-ZÁÊÍÓÚÂÃÕÇ\s]+)/i,
    /[A-ZÁÊÍÓÚÂÃÕÇ]{2,}\s+[A-ZÁÊÍÓÚÂÃÕÇ\s]{2,}/
  ];
  
  for (const pattern of namePatterns) {
    const match = detectionLine.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    } else if (match && match[0]) {
      return match[0].trim();
    }
  }
  
  return '(código desconhecido)';
}



/**
 * Detects PII patterns in text content with Brazilian validation
 */
export function detectPIIInText(text: string, filename: string, zipSource: string = 'unknown'): PIIDetection[] {
  const detections: PIIDetection[] = [];
  const timestamp = new Date().toISOString();

  // Detect each type of PII
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    
    if (matches) {
      for (const match of matches) {
        // Validate documents with Brazilian algorithms
        if (type === 'CPF' && !isValidCPF(match)) continue;
        if (type === 'CNPJ' && !isValidCNPJ(match)) continue;
        if (type === 'Telefone' && !isValidBrazilianPhone(match)) continue;
        
        // Extract titular from context
        const titular = extractTitular(text, match);
        
        detections.push({
          titular,
          documento: type as 'CPF' | 'CNPJ' | 'Email' | 'Telefone',
          valor: match,
          arquivo: filename,
          timestamp,
          zipSource
        });
      }
    }
  }

  return detections;
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
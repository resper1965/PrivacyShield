/**
 * PII Processor Service
 * Combines regex detection with OpenAI GPT-4o validation
 */

import { logger } from '../utils/logger';

export interface PIIDetection {
  titular: string;
  documento: 'CPF' | 'CNPJ' | 'Email' | 'Telefone';
  valor: string;
  arquivo: string;
  timestamp: string;
  zipSource: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  sensitivityScore?: number;
  aiConfidence?: number;
  reasoning?: string;
  contextualRisk?: string;
  recommendations?: string[];
}

/**
 * Enhanced Brazilian PII patterns with validation
 */
const PII_PATTERNS = {
  CPF: /\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}/g,
  CNPJ: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[-.]?\d{2}/g,
  Email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  Telefone: /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/g
};

/**
 * Validates CPF using Brazilian algorithm
 */
function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/[^\d]/g, '');
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = ((sum * 10) % 11) % 10;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = ((sum * 10) % 11) % 10;

  return parseInt(cleanCPF.charAt(9)) === digit1 && parseInt(cleanCPF.charAt(10)) === digit2;
}

/**
 * Validates CNPJ using Brazilian algorithm
 */
function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
  if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights1[i];
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weights2[i];
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  return parseInt(cleanCNPJ.charAt(12)) === digit1 && parseInt(cleanCNPJ.charAt(13)) === digit2;
}

/**
 * Validates Brazilian phone number
 */
function isValidBrazilianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[^\d]/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 13;
}

/**
 * Extracts titular (data subject) from context
 */
function extractTitular(text: string, detection: string): string {
  const beforeDetection = text.substring(0, text.indexOf(detection));
  const words = beforeDetection.split(/\s+/).slice(-10);
  
  const namePattern = /([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+)*)/g;
  const matches = beforeDetection.match(namePattern);
  
  return matches ? matches[matches.length - 1] : 'Não identificado';
}

/**
 * Detects PII patterns in text content with Brazilian validation
 */
export function detectPIIInText(text: string, filename: string, zipSource: string = 'unknown'): PIIDetection[] {
  const detections: PIIDetection[] = [];
  const timestamp = new Date().toISOString();

  Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
    const matches = text.match(pattern) || [];
    
    matches.forEach(match => {
      let isValid = true;
      
      // Validate based on type
      switch (type) {
        case 'CPF':
          isValid = isValidCPF(match);
          break;
        case 'CNPJ':
          isValid = isValidCNPJ(match);
          break;
        case 'Telefone':
          isValid = isValidBrazilianPhone(match);
          break;
        case 'Email':
          isValid = match.includes('@') && match.includes('.');
          break;
      }

      if (isValid) {
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
    });
  });

  logger.info(`Detected ${detections.length} PII items in ${filename}`);
  return detections;
}
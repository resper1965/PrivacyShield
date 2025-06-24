/**
 * PII Processor Service
 * Combines regex detection with OpenAI GPT-4o validation
 */

import { logger } from '../utils/logger';

export interface PIIDetection {
  titular: string;
  documento: 'Nome Completo' | 'CPF' | 'CNPJ' | 'RG' | 'CEP' | 'Email' | 'Telefone';
  valor: string;
  arquivo: string;
  timestamp: string;
  zipSource: string;
  context: string; // ±60 characters around detection
  position: number; // Character position in file
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  sensitivityScore?: number;
  aiConfidence?: number;
  reasoning?: string;
  contextualRisk?: string;
  recommendations?: string[];
}

/**
 * Enhanced Brazilian PII patterns with comprehensive validation
 */
const PII_PATTERNS = {
  'Nome Completo': /\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+){1,}\b/g,
  CPF: /\d{3}\.?\d{3}\.?\d{3}[-.]?\d{2}/g,
  CNPJ: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[-.]?\d{2}/g,
  RG: /\d{1,2}\.?\d{3}\.?\d{3}[-.]?[0-9xX]/g,
  CEP: /\d{5}[-.]?\d{3}/g,
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
    sum += parseInt(cleanCNPJ.charAt(i)) * (weights1[i] || 0);
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ.charAt(i)) * (weights2[i] || 0);
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
 * Validates Brazilian RG
 */
function isValidRG(rg: string): boolean {
  const cleanRG = rg.replace(/[^\dxX]/g, '');
  return cleanRG.length >= 7 && cleanRG.length <= 9;
}

/**
 * Validates Brazilian CEP
 */
function isValidCEP(cep: string): boolean {
  const cleanCEP = cep.replace(/[^\d]/g, '');
  return cleanCEP.length === 8 && !/^0{8}$/.test(cleanCEP);
}

/**
 * Validates Brazilian full name
 */
function isValidFullName(name: string): boolean {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 && parts.every(part => part.length >= 2);
}

/**
 * Extract context around detection (±60 characters)
 */
function extractContext(text: string, position: number, length: number): string {
  const contextLength = 60;
  const start = Math.max(0, position - contextLength);
  const end = Math.min(text.length, position + length + contextLength);
  return text.substring(start, end);
}

/**
 * Calculate risk level based on data type and context
 */
function calculateRiskLevel(type: string, context: string, filename: string): 'low' | 'medium' | 'high' | 'critical' {
  let baseRisk: 'low' | 'medium' | 'high' | 'critical';
  
  switch (type) {
    case 'CPF':
    case 'RG':
      baseRisk = 'high';
      break;
    case 'CNPJ':
      baseRisk = 'medium';
      break;
    case 'Nome Completo':
    case 'Email':
    case 'Telefone':
      baseRisk = 'medium';
      break;
    case 'CEP':
      baseRisk = 'low';
      break;
    default:
      baseRisk = 'medium';
  }

  // Increase risk for sensitive contexts
  const sensitiveKeywords = ['confidencial', 'secret', 'private', 'backup', 'export', 'database', 'sql'];
  const contextLower = context.toLowerCase();
  const filenameLower = filename.toLowerCase();
  
  const hasSensitiveContext = sensitiveKeywords.some(keyword => 
    contextLower.includes(keyword) || filenameLower.includes(keyword)
  );
  
  if (hasSensitiveContext) {
    if (baseRisk === 'medium') return 'high';
    if (baseRisk === 'high') return 'critical';
  }
  
  return baseRisk;
}

/**
 * Extracts titular (data subject) from context
 */
function extractTitular(text: string, detection: string): string {
  const beforeDetection = text.substring(0, text.indexOf(detection));
  
  const namePattern = /([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+)*)/g;
  const matches = beforeDetection.match(namePattern);
  
  return matches && matches.length > 0 ? (matches[matches.length - 1] || 'Não identificado') : 'Não identificado';
}

/**
 * Detects PII patterns in text content with Brazilian validation
 */
export function detectPIIInText(text: string, filename: string, zipSource: string = 'unknown'): PIIDetection[] {
  const detections: PIIDetection[] = [];
  const timestamp = new Date().toISOString();

  Object.entries(PII_PATTERNS).forEach(([type, pattern]) => {
    let match;
    pattern.lastIndex = 0; // Reset regex state
    
    while ((match = pattern.exec(text)) !== null) {
      const matchValue = match[0];
      const position = match.index;
      let isValid = true;
      
      // Validate based on type
      switch (type) {
        case 'CPF':
          isValid = isValidCPF(matchValue);
          break;
        case 'CNPJ':
          isValid = isValidCNPJ(matchValue);
          break;
        case 'RG':
          isValid = isValidRG(matchValue);
          break;
        case 'CEP':
          isValid = isValidCEP(matchValue);
          break;
        case 'Telefone':
          isValid = isValidBrazilianPhone(matchValue);
          break;
        case 'Email':
          isValid = matchValue.includes('@') && matchValue.includes('.');
          break;
        case 'Nome Completo':
          isValid = isValidFullName(matchValue);
          break;
      }

      if (isValid) {
        const titular = type === 'Nome Completo' ? matchValue : extractTitular(text, matchValue);
        const context = extractContext(text, position, matchValue.length);
        const riskLevel = calculateRiskLevel(type, context, filename);
        
        detections.push({
          titular,
          documento: type as any,
          valor: matchValue,
          arquivo: filename,
          timestamp,
          zipSource,
          context,
          position,
          riskLevel
        });
      }
    }
  });

  logger.info(`Detected ${detections.length} PII items in ${filename}`);
  return detections;
}
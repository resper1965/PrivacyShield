/**
 * PII Detection Module
 * Detects CPF, CNPJ, Email, and Phone patterns in text
 */

export interface PIIDetection {
  titular: string;
  documento: 'CPF' | 'CNPJ' | 'Email' | 'Telefone';
  valor: string;
  arquivo: string;
}

/**
 * Regex patterns for PII detection
 */
const PII_PATTERNS = {
  // CPF: 000.000.000-00 or 00000000000
  CPF: /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b/g,
  
  // CNPJ: 00.000.000/0000-00 or 00000000000000
  CNPJ: /\b\d{2}\.?\d{3}\.?\d{3}\/\d{4}-?\d{2}\b/g,
  
  // Email: basic email pattern
  Email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone: Brazilian phone patterns
  Telefone: /\b(?:\+55\s?)?\(?(?:\d{2})\)?\s?\d{4,5}-?\d{4}\b/g
};

/**
 * Validates CPF using algorithm
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
 * Validates CNPJ using algorithm (currently unused - detects all CNPJ patterns)
 */
function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) {
    return false;
  }

  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

// Keep function for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _unusedCNPJValidator = isValidCNPJ;

/**
 * Detects PII patterns in text content
 */
export function detectPIIInText(text: string, filename: string): PIIDetection[] {
  const detections: PIIDetection[] = [];

  // Detect each type of PII
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    
    if (matches) {
      for (const match of matches) {
        // Validate CPF (skip invalid ones)
        if (type === 'CPF' && !isValidCPF(match)) continue;
        // Note: CNPJ validation disabled to detect all CNPJ patterns
        // if (type === 'CNPJ' && !isValidCNPJ(match)) continue;
        
        detections.push({
          titular: '(código desconhecido)',
          documento: type as 'CPF' | 'CNPJ' | 'Email' | 'Telefone',
          valor: match,
          arquivo: filename
        });
      }
    }
  }

  return detections;
}

/**
 * Process multiple files and detect PII
 */
export function detectPIIInFiles(files: Array<{ content: string; filename: string }>): PIIDetection[] {
  const allDetections: PIIDetection[] = [];

  for (const file of files) {
    const detections = detectPIIInText(file.content, file.filename);
    allDetections.push(...detections);
  }

  return allDetections;
}
/**
 * Pattern Management Model
 * CRUD operations for PII detection patterns
 */

export interface PIIPattern {
  id: number;
  name: string;
  pattern: string;
  type: 'CPF' | 'CNPJ' | 'Email' | 'Telefone' | 'Custom';
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePatternData {
  name: string;
  pattern: string;
  type: 'CPF' | 'CNPJ' | 'Email' | 'Telefone' | 'Custom';
  description?: string;
  isActive?: boolean;
}

export interface UpdatePatternData {
  name?: string;
  pattern?: string;
  type?: 'CPF' | 'CNPJ' | 'Email' | 'Telefone' | 'Custom';
  description?: string;
  isActive?: boolean;
}

// Default Brazilian PII patterns
export const DEFAULT_PATTERNS: Omit<PIIPattern, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'CPF Brasileiro',
    pattern: '\\d{3}\\.?\\d{3}\\.?\\d{3}[-.]?\\d{2}',
    type: 'CPF',
    description: 'Cadastro de Pessoas Físicas - formato brasileiro',
    isActive: true,
    isDefault: true,
  },
  {
    name: 'CNPJ Brasileiro',
    pattern: '\\d{2}\\.?\\d{3}\\.?\\d{3}\\/?\\d{4}[-.]?\\d{2}',
    type: 'CNPJ',
    description: 'Cadastro Nacional de Pessoa Jurídica - formato brasileiro',
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Email Padrão',
    pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    type: 'Email',
    description: 'Endereço de email padrão RFC 5322',
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Telefone Brasileiro',
    pattern: '(?:\\+55\\s?)?(?:\\(?\\d{2}\\)?\\s?)?9?\\d{4}[-\\s]?\\d{4}',
    type: 'Telefone',
    description: 'Telefone brasileiro com ou sem código de área',
    isActive: true,
    isDefault: true,
  },
];

export class PatternValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PatternValidationError';
  }
}

/**
 * Validates a regex pattern
 */
export function validatePattern(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Tests a pattern against sample text
 */
export function testPattern(pattern: string, testText: string): string[] {
  try {
    const regex = new RegExp(pattern, 'g');
    const matches = testText.match(regex);
    return matches || [];
  } catch (error) {
    throw new PatternValidationError(`Invalid regex pattern: ${error}`);
  }
}
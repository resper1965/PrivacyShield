/**
 * Regex Pattern Management
 * Custom regex patterns for PII detection with Brazilian focus
 */

export interface RegexPattern {
  id: string;
  name: string;
  pattern: string;
  description: string;
  category: 'documento' | 'pessoal' | 'contato' | 'financeiro' | 'custom';
  enabled: boolean;
  validation?: (match: string) => boolean;
  examples: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default regex patterns including Brazilian proper names
 */
export const defaultRegexPatterns: Omit<RegexPattern, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'CPF',
    pattern: '\\b\\d{3}\\.?\\d{3}\\.?\\d{3}[-.]?\\d{2}\\b',
    description: 'Cadastro de Pessoa Física brasileiro',
    category: 'documento',
    enabled: true,
    examples: ['123.456.789-00', '12345678900']
  },
  {
    name: 'CNPJ',
    pattern: '\\b\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}[-.]?\\d{2}\\b',
    description: 'Cadastro Nacional de Pessoa Jurídica',
    category: 'documento',
    enabled: true,
    examples: ['12.345.678/0001-90', '12345678000190']
  },
  {
    name: 'RG',
    pattern: '\\b\\d{1,2}\\.?\\d{3}\\.?\\d{3}[-.]?[0-9xX]\\b',
    description: 'Registro Geral (Carteira de Identidade)',
    category: 'documento',
    enabled: true,
    examples: ['12.345.678-9', '123456789', '12.345.678-X']
  },
  {
    name: 'Email',
    pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
    description: 'Endereços de email',
    category: 'contato',
    enabled: true,
    examples: ['usuario@exemplo.com.br', 'contato@empresa.com']
  },
  {
    name: 'Telefone Brasileiro',
    pattern: '\\b(?:\\+?55\\s?)?\\(?[1-9]{2}\\)?\\s?9?[6-9]\\d{3}[-.]?\\d{4}\\b',
    description: 'Números de telefone brasileiros',
    category: 'contato',
    enabled: true,
    examples: ['(11) 99999-9999', '+55 11 98765-4321', '11987654321']
  },
  {
    name: 'CEP',
    pattern: '\\b\\d{5}[-.]?\\d{3}\\b',
    description: 'Código de Endereçamento Postal',
    category: 'pessoal',
    enabled: true,
    examples: ['01234-567', '12345678']
  },
  {
    name: 'Nome Próprio Brasileiro',
    pattern: '\\b(?:[A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][a-záéíóúâêôàãõç]+(?:\\s+(?:da|de|do|dos|das|e|del|von|van|la|le|di))?\\s+)+[A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][a-záéíóúâêôàãõç]+\\b',
    description: 'Nomes próprios brasileiros completos (nome e sobrenome)',
    category: 'pessoal',
    enabled: true,
    examples: ['João Silva Santos', 'Maria da Silva', 'José de Oliveira', 'Ana Paula Costa']
  },
  {
    name: 'Cartão de Crédito',
    pattern: '\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b',
    description: 'Números de cartão de crédito',
    category: 'financeiro',
    enabled: false,
    examples: ['1234 5678 9012 3456', '1234-5678-9012-3456']
  },
  {
    name: 'PIS/PASEP',
    pattern: '\\b\\d{3}\\.?\\d{5}\\.?\\d{2}[-.]?\\d{1}\\b',
    description: 'Programa de Integração Social / Programa de Formação do Patrimônio do Servidor Público',
    category: 'documento',
    enabled: true,
    examples: ['123.45678.90-1', '12345678901']
  },
  {
    name: 'Título de Eleitor',
    pattern: '\\b\\d{4}\\s?\\d{4}\\s?\\d{4}\\b',
    description: 'Número do título de eleitor',
    category: 'documento',
    enabled: true,
    examples: ['1234 5678 9012', '123456789012']
  }
];

/**
 * Validates Brazilian CPF
 */
export function validateCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11 || /^(\d)\1{10}$/.test(numbers)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i] || '0') * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 > 9) digit1 = 0;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i] || '0') * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 > 9) digit2 = 0;

  return parseInt(numbers[9] || '0') === digit1 && parseInt(numbers[10] || '0') === digit2;
}

/**
 * Validates Brazilian CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14 || /^(\d)\1{13}$/.test(numbers)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i] || '0') * (weights1[i] || 0);
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i] || '0') * (weights2[i] || 0);
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);

  return parseInt(numbers[12]) === digit1 && parseInt(numbers[13]) === digit2;
}

/**
 * Validates Brazilian proper names
 */
export function validateBrazilianName(name: string): boolean {
  // Check if has at least first and last name
  const nameParts = name.trim().split(/\s+/).filter(part => part.length > 1);
  if (nameParts.length < 2) return false;

  // Check for valid Brazilian name patterns
  const brazilianNamePattern = /^[A-ZÁÉÍÓÚÂÊÔÀÃÕÇ][a-záéíóúâêôàãõç]+(?:\s+(?:da|de|do|dos|das|e|del|von|van|la|le|di|Del|De|Do|Dos|Das|E))?$/;
  
  return nameParts.every(part => {
    // Allow connecting words
    if (['da', 'de', 'do', 'dos', 'das', 'e', 'del', 'von', 'van', 'la', 'le', 'di'].includes(part.toLowerCase())) {
      return true;
    }
    return brazilianNamePattern.test(part);
  });
}

/**
 * Apply validation to regex patterns
 */
export function applyValidation(pattern: RegexPattern, match: string): boolean {
  switch (pattern.name) {
    case 'CPF':
      return validateCPF(match);
    case 'CNPJ':
      return validateCNPJ(match);
    case 'Nome Próprio Brasileiro':
      return validateBrazilianName(match);
    default:
      return pattern.validation ? pattern.validation(match) : true;
  }
}

/**
 * Generate pattern ID
 */
export function generatePatternId(): string {
  return `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create regex pattern with metadata
 */
export function createRegexPattern(
  data: Omit<RegexPattern, 'id' | 'createdAt' | 'updatedAt'>
): RegexPattern {
  return {
    ...data,
    id: generatePatternId(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

/**
 * Test regex pattern against sample text
 */
export function testRegexPattern(pattern: string, text: string): Array<{ match: string; index: number }> {
  try {
    const regex = new RegExp(pattern, 'gi');
    const matches: Array<{ match: string; index: number }> = [];
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        match: match[0],
        index: match.index
      });
    }
    
    return matches;
  } catch (error) {
    throw new Error(`Invalid regex pattern: ${error.message}`);
  }
}
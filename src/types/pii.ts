/**
 * Shared PII Types
 * Centralized type definitions to avoid circular imports
 */

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

export interface DetectionSession {
  sessionId: string;
  zipFile: string;
  totalFiles: number;
  totalSize: number;
  detections: PIIDetection[];
  processingTime: number;
  createdAt: Date;
  timestamp?: string; // For backward compatibility
}

export interface EnhancedPIIDetection extends PIIDetection {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  aiConfidence: number;
  sensitivityScore: number;
  recommendations: string[];
  reasoning: string;
  contextualRisk: string;
}

export interface ProcessingResult {
  detections: EnhancedPIIDetection[];
  aiValidations: any[]; // Will be properly typed when AI module is created
  fileRiskScore: {
    overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  processingStats: {
    totalDetections: number;
    validDetections: number;
    falsePositives: number;
    aiProcessingTime: number;
    regexProcessingTime: number;
  };
} 
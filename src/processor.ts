/**
 * Enhanced PII Processor with OpenAI Integration
 * Combines regex detection with GPT-4o risk assessment
 */

import { PIIDetection, DetectionSession, detectPIIInText } from './detectPII';
import { validateWithOpenAI, batchValidateWithOpenAI, calculateFileRiskScore, AIValidationResult } from './ai/openaiValidator';

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
  aiValidations: AIValidationResult[];
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

/**
 * Process file content with enhanced AI validation
 */
export async function processFileWithAI(
  fileContent: string,
  filename: string,
  zipSource: string = 'unknown'
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  // Step 1: Regex-based PII detection
  const regexStartTime = Date.now();
  const regexDetections = detectPIIInText(fileContent, filename, zipSource);
  const regexProcessingTime = Date.now() - regexStartTime;

  if (regexDetections.length === 0) {
    return {
      detections: [],
      aiValidations: [],
      fileRiskScore: {
        overallRiskLevel: 'low',
        riskScore: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0
      },
      processingStats: {
        totalDetections: 0,
        validDetections: 0,
        falsePositives: 0,
        aiProcessingTime: 0,
        regexProcessingTime
      }
    };
  }

  // Step 2: Prepare data for AI validation
  const aiStartTime = Date.now();
  const aiValidationRequests = regexDetections.map(detection => ({
    text: detection.valor,
    type: detection.documento,
    context: extractContext(fileContent, detection.valor, 200),
    filename: detection.arquivo
  }));

  // Step 3: AI validation using OpenAI GPT-4o
  const aiValidations = await batchValidateWithOpenAI(aiValidationRequests);
  const aiProcessingTime = Date.now() - aiStartTime;

  // Step 4: Merge regex results with AI assessments
  const enhancedDetections: EnhancedPIIDetection[] = regexDetections.map((detection, index) => {
    const aiValidation = aiValidations[index];
    
    return {
      ...detection,
      riskLevel: aiValidation?.riskAssessment.riskLevel || 'medium',
      aiConfidence: aiValidation?.aiConfidence || 0.5,
      sensitivityScore: aiValidation?.riskAssessment.sensitivityScore || 5,
      recommendations: aiValidation?.recommendations || [],
      reasoning: aiValidation?.riskAssessment.reasoning || 'Standard detection',
      contextualRisk: aiValidation?.riskAssessment.contextualRisk || 'No additional context'
    };
  });

  // Step 5: Calculate file-level risk score
  const fileRiskScore = calculateFileRiskScore(aiValidations);

  // Step 6: Processing statistics
  const validDetections = aiValidations.filter(v => v.isValid).length;
  const falsePositives = aiValidations.length - validDetections;

  return {
    detections: enhancedDetections,
    aiValidations,
    fileRiskScore,
    processingStats: {
      totalDetections: regexDetections.length,
      validDetections,
      falsePositives,
      aiProcessingTime,
      regexProcessingTime
    }
  };
}

/**
 * Process multiple files with AI validation
 */
export async function processFilesWithAI(
  files: Array<{ content: string; filename: string }>,
  zipSource: string = 'unknown'
): Promise<{
  results: ProcessingResult[];
  aggregateStats: {
    totalFiles: number;
    totalDetections: number;
    totalValidDetections: number;
    totalFalsePositives: number;
    overallRiskDistribution: Record<string, number>;
    processingTime: number;
  };
}> {
  const startTime = Date.now();
  const results: ProcessingResult[] = [];

  // Process files sequentially to manage OpenAI rate limits
  for (const file of files) {
    console.log(`🔍 Processing file: ${file.filename}`);
    const result = await processFileWithAI(file.content, file.filename, zipSource);
    results.push(result);
    
    // Small delay between files to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Calculate aggregate statistics
  const aggregateStats = {
    totalFiles: files.length,
    totalDetections: results.reduce((sum, r) => sum + r.processingStats.totalDetections, 0),
    totalValidDetections: results.reduce((sum, r) => sum + r.processingStats.validDetections, 0),
    totalFalsePositives: results.reduce((sum, r) => sum + r.processingStats.falsePositives, 0),
    overallRiskDistribution: {
      critical: results.reduce((sum, r) => sum + r.fileRiskScore.criticalCount, 0),
      high: results.reduce((sum, r) => sum + r.fileRiskScore.highCount, 0),
      medium: results.reduce((sum, r) => sum + r.fileRiskScore.mediumCount, 0),
      low: results.reduce((sum, r) => sum + r.fileRiskScore.lowCount, 0)
    },
    processingTime: Date.now() - startTime
  };

  return { results, aggregateStats };
}

/**
 * Convert enhanced detections to legacy format for compatibility
 */
export function convertToLegacyDetections(enhancedDetections: EnhancedPIIDetection[]): PIIDetection[] {
  return enhancedDetections.map(detection => ({
    titular: detection.titular,
    documento: detection.documento,
    valor: detection.valor,
    arquivo: detection.arquivo,
    timestamp: detection.timestamp,
    zipSource: detection.zipSource
  }));
}

/**
 * Create enhanced detection session with AI data
 */
export async function createEnhancedDetectionSession(
  sessionId: string,
  zipFile: string,
  processingResults: ProcessingResult[]
): Promise<DetectionSession & {
  aiEnhanced: true;
  riskSummary: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    averageRiskScore: number;
    highRiskFiles: string[];
    recommendations: string[];
  };
}> {
  const allDetections = processingResults.flatMap(r => convertToLegacyDetections(r.detections));
  const allEnhancedDetections = processingResults.flatMap(r => r.detections);

  // Calculate session-level risk summary
  const riskScores = processingResults.map(r => r.fileRiskScore.riskScore);
  const averageRiskScore = riskScores.length > 0 ? 
    riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length : 0;

  const criticalFiles = processingResults
    .filter(r => r.fileRiskScore.overallRiskLevel === 'critical')
    .map(r => r.detections[0]?.arquivo || 'unknown')
    .filter(Boolean);

  const highRiskFiles = processingResults
    .filter(r => ['critical', 'high'].includes(r.fileRiskScore.overallRiskLevel))
    .map(r => r.detections[0]?.arquivo || 'unknown')
    .filter(Boolean);

  // Aggregate recommendations
  const allRecommendations = allEnhancedDetections
    .flatMap(d => d.recommendations)
    .filter((rec, index, arr) => arr.indexOf(rec) === index); // Remove duplicates

  let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (criticalFiles.length > 0) {
    overallRisk = 'critical';
  } else if (highRiskFiles.length > 0) {
    overallRisk = 'high';
  } else if (averageRiskScore > 50) {
    overallRisk = 'medium';
  }

  return {
    sessionId,
    timestamp: new Date().toISOString(),
    zipFile,
    totalFiles: processingResults.length,
    totalDetections: allDetections.length,
    detections: allDetections,
    aiEnhanced: true,
    riskSummary: {
      overallRisk,
      averageRiskScore: Math.round(averageRiskScore),
      highRiskFiles,
      recommendations: allRecommendations.slice(0, 10) // Limit to top 10 recommendations
    }
  };
}

/**
 * Extract context around detected PII for AI analysis
 */
function extractContext(text: string, detectedValue: string, contextLength: number = 200): string {
  const index = text.indexOf(detectedValue);
  if (index === -1) return text.substring(0, contextLength);

  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(text.length, index + detectedValue.length + contextLength / 2);
  
  return text.substring(start, end);
}

/**
 * Get processing statistics summary
 */
export function getProcessingStatsSummary(results: ProcessingResult[]): {
  summary: string;
  metrics: Record<string, number | string>;
} {
  const totalFiles = results.length;
  const totalDetections = results.reduce((sum, r) => sum + r.processingStats.totalDetections, 0);
  const validDetections = results.reduce((sum, r) => sum + r.processingStats.validDetections, 0);
  const falsePositiveRate = totalDetections > 0 ? 
    ((totalDetections - validDetections) / totalDetections * 100).toFixed(1) : '0.0';

  const avgAiTime = results.length > 0 ?
    (results.reduce((sum, r) => sum + r.processingStats.aiProcessingTime, 0) / results.length).toFixed(0) : '0';

  const criticalCount = results.reduce((sum, r) => sum + r.fileRiskScore.criticalCount, 0);
  const highCount = results.reduce((sum, r) => sum + r.fileRiskScore.highCount, 0);

  return {
    summary: `Processed ${totalFiles} files with ${validDetections} valid PII detections. ` +
             `False positive rate: ${falsePositiveRate}%. ` +
             `High/Critical risks: ${highCount + criticalCount} detections.`,
    metrics: {
      totalFiles,
      totalDetections,
      validDetections,
      falsePositiveRate: `${falsePositiveRate}%`,
      avgAiProcessingTime: `${avgAiTime}ms`,
      criticalRisks: criticalCount,
      highRisks: highCount
    }
  };
}
/**
 * File Worker
 * Processes individual files for PII detection with OpenAI validation
 */

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { FileJobData } from '../services/queue';
import { detectPIIInText, PIIDetection } from '../services/processor';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

interface AIValidationResult {
  isValid: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasoning: string;
  sensitivityScore: number;
  contextualRisk: string;
  recommendations: string[];
}

async function validateWithOpenAI(
  detectedText: string,
  detectedType: string,
  context: string,
  filename: string
): Promise<AIValidationResult> {
  try {
    const prompt = `Analyze the following detected PII data and provide a comprehensive risk assessment.

DETECTED DATA: "${detectedText}"
DETECTED TYPE: ${detectedType}
FILE CONTEXT: ${filename}
SURROUNDING CONTEXT: "${context}"

Please analyze this data and respond with JSON in the following format:
{
  "isValid": boolean (true if this is actually PII of the stated type),
  "riskLevel": "low" | "medium" | "high" | "critical",
  "confidence": number between 0 and 1,
  "reasoning": "detailed explanation of why this risk level was assigned",
  "sensitivityScore": number between 0 and 10,
  "contextualRisk": "assessment of risk based on file context and surrounding data",
  "recommendations": ["array", "of", "security", "recommendations"]
}

Consider factors like:
- Is this actually valid PII or a false positive?
- Sensitivity of the data type in Brazilian context
- Potential for identity theft or fraud
- File context and data exposure risk
- Compliance requirements (LGPD, GDPR)`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a cybersecurity expert specializing in PII detection and risk assessment. Provide accurate, detailed analysis in the requested JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1000
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error('No response from OpenAI');
    }
    
    const aiResult = JSON.parse(messageContent);

    return {
      isValid: aiResult.isValid || false,
      riskLevel: aiResult.riskLevel || 'medium',
      confidence: Math.max(0, Math.min(1, aiResult.confidence || 0.5)),
      reasoning: aiResult.reasoning || 'AI analysis completed',
      sensitivityScore: Math.max(0, Math.min(10, aiResult.sensitivityScore || 5)),
      contextualRisk: aiResult.contextualRisk || 'Standard risk assessment',
      recommendations: Array.isArray(aiResult.recommendations) ? aiResult.recommendations : []
    };

  } catch (error) {
    logger.error('OpenAI validation error:', error);
    
    // Fallback to rule-based assessment
    return getFallbackAssessment(detectedType, filename);
  }
}

function getFallbackAssessment(detectedType: string, filename: string): AIValidationResult {
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let sensitivityScore = 5;
  let recommendations: string[] = [];

  switch (detectedType) {
    case 'CPF':
      riskLevel = 'high';
      sensitivityScore = 8;
      recommendations = ['Mask CPF numbers in logs', 'Implement access controls', 'Ensure LGPD compliance'];
      break;
    case 'CNPJ':
      riskLevel = 'medium';
      sensitivityScore = 6;
      recommendations = ['Validate business context', 'Implement audit trail'];
      break;
    case 'Email':
      riskLevel = 'medium';
      sensitivityScore = 5;
      recommendations = ['Validate email collection consent', 'Implement email encryption'];
      break;
    case 'Telefone':
      riskLevel = 'medium';
      sensitivityScore = 6;
      recommendations = ['Mask phone numbers in logs', 'Validate collection purpose'];
      break;
  }

  // Increase risk for sensitive filenames
  const sensitivePatterns = ['confidential', 'secret', 'private', 'backup', 'export'];
  if (sensitivePatterns.some(pattern => filename.toLowerCase().includes(pattern))) {
    if (riskLevel === 'medium') riskLevel = 'high';
    if (riskLevel === 'high') riskLevel = 'critical';
    sensitivityScore = Math.min(10, sensitivityScore + 2);
  }

  return {
    isValid: true,
    riskLevel,
    confidence: 0.7,
    reasoning: `Rule-based assessment: ${detectedType} detected in ${filename}`,
    sensitivityScore,
    contextualRisk: 'Rule-based contextual assessment',
    recommendations
  };
}

function extractContext(text: string, detectedValue: string, contextLength: number = 200): string {
  const index = text.indexOf(detectedValue);
  if (index === -1) return text.substring(0, contextLength);

  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(text.length, index + detectedValue.length + contextLength / 2);
  
  return text.substring(start, end);
}

export const fileWorker = new Worker<FileJobData>(
  'file-processing',
  async (job: Job<FileJobData>) => {
    const { fileContent, filename, zipSource, sessionId, sourceId } = job.data;
    
    logger.info(`Processing file with AI: ${filename} from ${zipSource}`);
    
    try {
      // Step 1: Regex-based PII detection
      const regexDetections = detectPIIInText(fileContent, filename, zipSource);
      
      if (regexDetections.length === 0) {
        logger.debug(`No PII detected in ${filename}`);
        return {
          filename,
          detectionsCount: 0,
          validDetections: 0,
          processingTime: Date.now() - job.processedOn!
        };
      }

      // Step 2: AI validation for each detection
      const enhancedDetections: (PIIDetection & AIValidationResult)[] = [];
      
      for (const detection of regexDetections) {
        const context = extractContext(fileContent, detection.valor);
        const aiValidation = await validateWithOpenAI(
          detection.valor,
          detection.documento,
          context,
          detection.arquivo
        );
        
        enhancedDetections.push({
          ...detection,
          ...aiValidation
        });
      }

      // Step 3: Filter valid detections and save to database
      const validDetections = enhancedDetections.filter(d => d.isValid);
      
      if (validDetections.length > 0) {
        // Create detection records in database
        const detectionRecords = await prisma.detection.createMany({
          data: validDetections.map(detection => ({
            titular: detection.titular,
            documento: detection.documento,
            valor: detection.valor,
            arquivo: detection.arquivo,
            fileId: 1, // This should be linked to the actual file record
            riskLevel: detection.riskLevel,
            sensitivityScore: detection.sensitivityScore,
            aiConfidence: detection.confidence,
            reasoning: detection.reasoning,
            contextualRisk: detection.contextualRisk,
            recommendations: detection.recommendations,
          }))
        });
        
        logger.info(`Saved ${detectionRecords.count} detections for ${filename}`);
      }

      const processingTime = Date.now() - job.processedOn!;
      
      logger.info(`File processed: ${filename} - ${validDetections.length} valid detections`);
      
      return {
        filename,
        detectionsCount: regexDetections.length,
        validDetections: validDetections.length,
        falsePositives: regexDetections.length - validDetections.length,
        riskDistribution: {
          critical: validDetections.filter(d => d.riskLevel === 'critical').length,
          high: validDetections.filter(d => d.riskLevel === 'high').length,
          medium: validDetections.filter(d => d.riskLevel === 'medium').length,
          low: validDetections.filter(d => d.riskLevel === 'low').length,
        },
        processingTime
      };
      
    } catch (error) {
      logger.error(`File processing failed: ${filename}`, error);
      
      // Fallback to basic regex detection without AI
      try {
        const basicDetections = detectPIIInText(fileContent, filename, zipSource);
        logger.info(`Fallback processing: ${filename} - ${basicDetections.length} basic detections`);
        
        return {
          filename,
          detectionsCount: basicDetections.length,
          validDetections: basicDetections.length,
          fallbackUsed: true,
          processingTime: Date.now() - job.processedOn!
        };
      } catch (fallbackError) {
        logger.error(`Fallback processing also failed: ${filename}`, fallbackError);
        throw error;
      }
    }
  },
  {
    connection: {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
    },
    concurrency: 3, // Process multiple files in parallel
  }
);

// Event handlers
fileWorker.on('completed', (job, result) => {
  logger.info(`File job completed: ${job.id} - ${job.data.filename} (${result.validDetections} detections)`);
});

fileWorker.on('failed', (job, err) => {
  logger.error(`File job failed: ${job?.id} - ${job?.data?.filename}`, err);
});

fileWorker.on('error', (err) => {
  logger.error('File worker error:', err);
});

export default fileWorker;
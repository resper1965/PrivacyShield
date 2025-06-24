/**
 * OpenAI Validator
 * Enhanced PII validation using GPT-4o for risk assessment
 */

import OpenAI from 'openai';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env['OPENAI_API_KEY'] || ''
});

export interface RiskAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1
  reasoning: string;
  dataType: string;
  sensitivityScore: number; // 0-10
  contextualRisk: string;
}

export interface AIValidationResult {
  originalData: string;
  detectedType: string;
  isValid: boolean;
  riskAssessment: RiskAssessment;
  aiConfidence: number;
  recommendations: string[];
}

/**
 * Validates and assesses risk of detected PII using OpenAI GPT-4o
 */
export async function validateWithOpenAI(
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
  "dataType": "refined classification of the data type",
  "sensitivityScore": number between 0 and 10,
  "contextualRisk": "assessment of risk based on file context and surrounding data",
  "recommendations": ["array", "of", "security", "recommendations"]
}

Consider factors like:
- Is this actually valid PII or a false positive?
- Sensitivity of the data type in Brazilian context
- Potential for identity theft or fraud
- File context and data exposure risk
- Compliance requirements (LGPD, GDPR)
- Contextual indicators of legitimate vs suspicious usage`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      temperature: 0.1, // Low temperature for consistent results
      max_tokens: 1000
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error('No response from OpenAI');
    }
    const aiResult = JSON.parse(messageContent);

    return {
      originalData: detectedText,
      detectedType,
      isValid: aiResult.isValid || false,
      riskAssessment: {
        riskLevel: aiResult.riskLevel || 'medium',
        confidence: Math.max(0, Math.min(1, aiResult.confidence || 0.5)),
        reasoning: aiResult.reasoning || 'AI analysis completed',
        dataType: aiResult.dataType || detectedType,
        sensitivityScore: Math.max(0, Math.min(10, aiResult.sensitivityScore || 5)),
        contextualRisk: aiResult.contextualRisk || 'Standard risk assessment'
      },
      aiConfidence: Math.max(0, Math.min(1, aiResult.confidence || 0.5)),
      recommendations: Array.isArray(aiResult.recommendations) ? aiResult.recommendations : []
    };

  } catch (error) {
    console.error('OpenAI validation error:', error);
    
    // Fallback to rule-based risk assessment
    return getFallbackRiskAssessment(detectedText, detectedType, filename);
  }
}

/**
 * Fallback risk assessment when OpenAI is unavailable
 */
function getFallbackRiskAssessment(
  detectedText: string,
  detectedType: string,
  filename: string
): AIValidationResult {
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let sensitivityScore = 5;
  let recommendations: string[] = [];

  // Rule-based risk assessment
  switch (detectedType) {
    case 'CPF':
      riskLevel = 'high';
      sensitivityScore = 8;
      recommendations = [
        'Mask CPF numbers in logs and displays',
        'Implement access controls for CPF data',
        'Ensure LGPD compliance for CPF processing'
      ];
      break;
    
    case 'CNPJ':
      riskLevel = 'medium';
      sensitivityScore = 6;
      recommendations = [
        'Validate business context for CNPJ usage',
        'Implement audit trail for CNPJ access'
      ];
      break;
    
    case 'Email':
      riskLevel = 'medium';
      sensitivityScore = 5;
      recommendations = [
        'Validate email collection consent',
        'Implement email encryption in transit'
      ];
      break;
    
    case 'Telefone':
      riskLevel = 'medium';
      sensitivityScore = 6;
      recommendations = [
        'Mask phone numbers in logs',
        'Validate phone number collection purpose'
      ];
      break;
  }

  // Increase risk for sensitive filenames
  const sensitiveFilePatterns = ['confidential', 'secret', 'private', 'backup', 'export'];
  if (sensitiveFilePatterns.some(pattern => filename.toLowerCase().includes(pattern))) {
    if (riskLevel === 'medium') riskLevel = 'high';
    if (riskLevel === 'high') riskLevel = 'critical';
    sensitivityScore = Math.min(10, sensitivityScore + 2);
  }

  return {
    originalData: detectedText,
    detectedType,
    isValid: true, // Assume regex matches are valid in fallback
    riskAssessment: {
      riskLevel,
      confidence: 0.7, // Lower confidence for rule-based assessment
      reasoning: `Rule-based assessment: ${detectedType} detected in ${filename}`,
      dataType: detectedType,
      sensitivityScore,
      contextualRisk: 'Rule-based contextual assessment'
    },
    aiConfidence: 0.7,
    recommendations
  };
}

/**
 * Batch validate multiple PII detections
 */
export async function batchValidateWithOpenAI(
  detections: Array<{
    text: string;
    type: string;
    context: string;
    filename: string;
  }>
): Promise<AIValidationResult[]> {
  const results: AIValidationResult[] = [];
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < detections.length; i += batchSize) {
    const batch = detections.slice(i, i + batchSize);
    
    const batchPromises = batch.map(detection =>
      validateWithOpenAI(detection.text, detection.type, detection.context, detection.filename)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < detections.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Calculate overall risk score for a file
 */
export function calculateFileRiskScore(validationResults: AIValidationResult[]): {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
} {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  let totalScore = 0;
  let validDetections = 0;

  validationResults.forEach(result => {
    if (result.isValid) {
      validDetections++;
      const riskLevel = result.riskAssessment.riskLevel;
      counts[riskLevel]++;
      
      // Convert risk level to numeric score
      const riskValue = {
        critical: 100,
        high: 75,
        medium: 50,
        low: 25
      }[riskLevel];
      
      totalScore += riskValue * result.riskAssessment.confidence;
    }
  });

  const averageScore = validDetections > 0 ? totalScore / validDetections : 0;
  
  // Determine overall risk level
  let overallRiskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (counts.critical > 0) {
    overallRiskLevel = 'critical';
  } else if (counts.high > 0) {
    overallRiskLevel = 'high';
  } else if (counts.medium > 0) {
    overallRiskLevel = 'medium';
  }

  return {
    overallRiskLevel,
    riskScore: Math.round(averageScore),
    criticalCount: counts.critical,
    highCount: counts.high,
    mediumCount: counts.medium,
    lowCount: counts.low
  };
}
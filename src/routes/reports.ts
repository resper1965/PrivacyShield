/**
 * Reports Routes
 * GET /api/v1/reports/lgpd/consolidado - Consolidated LGPD report
 * GET /api/v1/reports/titulares - Data subjects report
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as fastCsv from 'fast-csv';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/reports/lgpd/consolidado
 * Generate consolidated LGPD compliance report
 */
router.get('/lgpd/consolidado', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get detection statistics
    const detections = await prisma.detection.findMany({
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      include: {
        file: true,
      },
    });

    // Calculate metrics
    const totalDetections = detections.length;
    const riskDistribution = detections.reduce((acc, detection) => {
      acc[detection.riskLevel] = (acc[detection.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeDistribution = detections.reduce((acc, detection) => {
      acc[detection.documento] = (acc[detection.documento] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const uniqueTitulares = new Set(detections.map(d => d.titular)).size;
    const highRiskDetections = detections.filter(d => d.riskLevel === 'high' || d.riskLevel === 'critical').length;
    
    const complianceScore = Math.max(0, 100 - (highRiskDetections * 5) - (riskDistribution.critical || 0) * 15);

    const report = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalDetections,
        uniqueDataSubjects: uniqueTitulares,
        complianceScore: Math.round(complianceScore),
        highRiskCount: highRiskDetections,
      },
      riskDistribution,
      typeDistribution,
      topRisks: detections
        .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
        .slice(0, 10)
        .map(d => ({
          titular: d.titular,
          documento: d.documento,
          valor: d.valor.substring(0, 10) + '***',
          riskLevel: d.riskLevel,
          reasoning: d.reasoning,
        })),
      recommendations: [
        'Implement data masking for high-risk PII',
        'Review consent mechanisms for data collection',
        'Enhance access controls for sensitive data',
        'Establish regular compliance audits',
      ],
      generatedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=lgpd-consolidado.csv');
      
      const csvData = detections.map(d => ({
        data_titular: d.titular,
        tipo_documento: d.documento,
        nivel_risco: d.riskLevel,
        pontuacao_sensibilidade: d.sensitivityScore,
        confianca_ia: d.aiConfidence,
        arquivo: d.arquivo,
        timestamp: d.timestamp.toISOString(),
      }));

      fastCsv.writeToStream(res, csvData, { headers: true });
    } else {
      res.status(200).json({
        message: 'LGPD consolidated report generated successfully',
        report,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    logger.error('Error generating LGPD consolidated report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate LGPD consolidated report',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/reports/titulares
 * Generate data subjects (titulares) report with grouping and filtering
 */
router.get('/titulares', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      documento, 
      riskLevel, 
      startDate, 
      endDate, 
      groupBy = 'titular',
      format = 'json' 
    } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Build where clause
    const whereClause: any = {
      timestamp: {
        gte: start,
        lte: end,
      },
    };

    if (documento) {
      whereClause.documento = documento;
    }

    if (riskLevel) {
      whereClause.riskLevel = riskLevel;
    }

    const detections = await prisma.detection.findMany({
      where: whereClause,
      include: {
        file: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Group detections by specified field
    const grouped = detections.reduce((acc, detection) => {
      let key: string;
      
      switch (groupBy) {
        case 'documento':
          key = detection.documento;
          break;
        case 'riskLevel':
          key = detection.riskLevel;
          break;
        case 'arquivo':
          key = detection.arquivo;
          break;
        default:
          key = detection.titular;
      }

      if (!acc[key]) {
        acc[key] = {
          key,
          detections: [],
          count: 0,
          riskLevels: new Set(),
          documentTypes: new Set(),
          files: new Set(),
          avgSensitivityScore: 0,
          avgAiConfidence: 0,
        };
      }

      acc[key].detections.push({
        id: detection.id,
        documento: detection.documento,
        valor: detection.valor.substring(0, 10) + '***', // Mask sensitive data
        riskLevel: detection.riskLevel,
        sensitivityScore: detection.sensitivityScore,
        aiConfidence: detection.aiConfidence,
        arquivo: detection.arquivo,
        timestamp: detection.timestamp,
        reasoning: detection.reasoning,
      });

      acc[key].count++;
      acc[key].riskLevels.add(detection.riskLevel);
      acc[key].documentTypes.add(detection.documento);
      acc[key].files.add(detection.arquivo);

      return acc;
    }, {} as Record<string, any>);

    // Calculate averages and convert sets to arrays
    const results = Object.values(grouped).map((group: any) => {
      const totalSensitivity = group.detections.reduce((sum: number, d: any) => sum + d.sensitivityScore, 0);
      const totalConfidence = group.detections.reduce((sum: number, d: any) => sum + d.aiConfidence, 0);

      return {
        ...group,
        avgSensitivityScore: Math.round((totalSensitivity / group.count) * 100) / 100,
        avgAiConfidence: Math.round((totalConfidence / group.count) * 100) / 100,
        riskLevels: Array.from(group.riskLevels),
        documentTypes: Array.from(group.documentTypes),
        files: Array.from(group.files),
        highestRisk: group.detections.reduce((max: string, d: any) => {
          const riskOrder = { low: 1, medium: 2, high: 3, critical: 4 };
          return riskOrder[d.riskLevel as keyof typeof riskOrder] > riskOrder[max as keyof typeof riskOrder] ? d.riskLevel : max;
        }, 'low'),
      };
    });

    // Sort by count descending
    results.sort((a, b) => b.count - a.count);

    const reportData = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      filters: {
        documento,
        riskLevel,
        groupBy,
      },
      summary: {
        totalGroups: results.length,
        totalDetections: detections.length,
        averageDetectionsPerGroup: Math.round((detections.length / results.length) * 100) / 100,
      },
      groups: results,
      generatedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=titulares-report.csv');
      
      const csvData = results.flatMap(group => 
        group.detections.map((d: any) => ({
          grupo: group.key,
          total_deteccoes: group.count,
          maior_risco: group.highestRisk,
          tipos_documento: group.documentTypes.join(';'),
          documento: d.documento,
          nivel_risco: d.riskLevel,
          pontuacao_sensibilidade: d.sensitivityScore,
          confianca_ia: d.aiConfidence,
          arquivo: d.arquivo,
          timestamp: d.timestamp,
        }))
      );

      fastCsv.writeToStream(res, csvData, { headers: true });
    } else {
      res.status(200).json({
        message: 'Data subjects report generated successfully',
        report: reportData,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    logger.error('Error generating titulares report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate titulares report',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
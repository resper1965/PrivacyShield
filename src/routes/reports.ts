/**
 * Enhanced Reports Routes
 * LGPD compliance reporting with filtering and CSV export
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as fastCsv from 'fast-csv';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/reports/lgpd/titulares
 * Advanced filtering by domain and CNPJ with CSV export
 */
router.get('/lgpd/titulares', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      domain, 
      cnpj, 
      documento, 
      riskLevel, 
      startDate, 
      endDate, 
      format = 'json',
      limit = 100,
      offset = 0
    } = req.query;

    // Build where clause with OR logic for domain and CNPJ
    const whereClause: any = {
      timestamp: {
        gte: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        lte: endDate ? new Date(endDate as string) : new Date(),
      },
    };

    // OR logic for domain and CNPJ filtering
    const orConditions: any[] = [];
    
    if (domain) {
      orConditions.push({
        OR: [
          { valor: { contains: domain as string } },
          { arquivo: { contains: domain as string } },
          { contextualRisk: { contains: domain as string } }
        ]
      });
    }
    
    if (cnpj) {
      const cleanCNPJ = (cnpj as string).replace(/[^\d]/g, '');
      orConditions.push({
        OR: [
          { valor: { contains: cleanCNPJ } },
          { documento: 'CNPJ', valor: { contains: cnpj as string } }
        ]
      });
    }

    if (orConditions.length > 0) {
      whereClause.OR = orConditions.flat();
    }

    // Additional filters
    if (documento) whereClause.documento = documento;
    if (riskLevel) whereClause.riskLevel = riskLevel;

    const detections = await prisma.detection.findMany({
      where: whereClause,
      include: {
        file: {
          select: {
            filename: true,
            originalName: true,
            zipSource: true,
            uploadedAt: true
          }
        }
      },
      orderBy: [
        { riskLevel: 'desc' },
        { timestamp: 'desc' }
      ],
      take: format === 'csv' ? undefined : Number(limit),
      skip: format === 'csv' ? undefined : Number(offset)
    });

    // Group by titular for response
    const groupedData = detections.reduce((acc, detection) => {
      const titular = detection.titular;
      
      if (!acc[titular]) {
        acc[titular] = {
          titular,
          documento: detection.documento,
          valor: detection.valor.substring(0, 10) + '***', // Mask sensitive data
          arquivos: [],
          detections: 0,
          riskLevels: new Set<string>(),
          timestamps: []
        };
      }
      
      acc[titular].arquivos.push({
        nome: detection.arquivo,
        zipSource: detection.file?.zipSource,
        uploadedAt: detection.file?.uploadedAt,
        riskLevel: detection.riskLevel,
        context: detection.context
      });
      
      acc[titular].detections++;
      acc[titular].riskLevels.add(detection.riskLevel);
      acc[titular].timestamps.push(detection.timestamp);
      
      return acc;
    }, {} as Record<string, any>);

    const results = Object.values(groupedData).map((group: any) => ({
      ...group,
      riskLevels: Array.from(group.riskLevels),
      highestRisk: Array.from(group.riskLevels).includes('critical') ? 'critical' :
                   Array.from(group.riskLevels).includes('high') ? 'high' :
                   Array.from(group.riskLevels).includes('medium') ? 'medium' : 'low',
      lastDetection: Math.max(...group.timestamps.map((t: Date) => new Date(t).getTime()))
    }));

    if (format === 'csv') {
      // Stream CSV with BOM for proper encoding
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=lgpd-titulares.csv');
      
      // Write BOM for UTF-8
      res.write('\uFEFF');
      
      const csvData = results.flatMap(titular => 
        titular.arquivos.map((arquivo: any) => ({
          titular: titular.titular,
          documento: titular.documento,
          valor_mascarado: titular.valor,
          arquivo: arquivo.nome,
          zip_source: arquivo.zipSource,
          nivel_risco: arquivo.riskLevel,
          contexto: arquivo.context,
          upload_date: arquivo.uploadedAt,
          total_deteccoes: titular.detections,
          maior_risco: titular.highestRisk
        }))
      );

      const csvStream = fastCsv.format({ headers: true });
      csvStream.pipe(res);
      
      for (const row of csvData) {
        csvStream.write(row);
      }
      csvStream.end();
      
    } else {
      res.status(200).json({
        message: 'LGPD titulares report generated successfully',
        filters: { domain, cnpj, documento, riskLevel },
        summary: {
          totalTitulares: results.length,
          totalDetections: detections.length,
          criticalCount: results.filter(r => r.highestRisk === 'critical').length,
          highCount: results.filter(r => r.highestRisk === 'high').length
        },
        titulares: results,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    logger.error('Error generating LGPD titulares report:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate LGPD titulares report',
      statusCode: 500,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/v1/reports/lgpd/consolidado
 * Consolidated LGPD compliance report
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

    // Calculate comprehensive metrics
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
    const uniqueFiles = new Set(detections.map(d => d.arquivo)).size;
    const highRiskDetections = detections.filter(d => d.riskLevel === 'high' || d.riskLevel === 'critical').length;
    
    // LGPD compliance score calculation
    const criticalPenalty = (riskDistribution.critical || 0) * 20;
    const highPenalty = (riskDistribution.high || 0) * 10;
    const mediumPenalty = (riskDistribution.medium || 0) * 5;
    const complianceScore = Math.max(0, 100 - criticalPenalty - highPenalty - mediumPenalty);

    const report = {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalDetections,
        uniqueDataSubjects: uniqueTitulares,
        uniqueFiles,
        complianceScore: Math.round(complianceScore),
        highRiskCount: highRiskDetections,
        avgDetectionsPerFile: Math.round((totalDetections / uniqueFiles) * 100) / 100
      },
      riskDistribution,
      typeDistribution,
      topRisks: detections
        .filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high')
        .slice(0, 20)
        .map(d => ({
          titular: d.titular,
          documento: d.documento,
          valor: d.valor.substring(0, 10) + '***',
          arquivo: d.arquivo,
          riskLevel: d.riskLevel,
          context: d.context?.substring(0, 100) + '...',
          reasoning: d.reasoning
        })),
      recommendations: [
        'Implement data masking for high-risk PII in production systems',
        'Review and update consent mechanisms for personal data collection',
        'Enhance access controls and audit trails for sensitive data',
        'Establish regular automated compliance scans',
        'Consider data minimization strategies for collected information',
        'Implement data retention policies aligned with LGPD requirements'
      ],
      generatedAt: new Date().toISOString(),
    };

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=lgpd-consolidado.csv');
      
      res.write('\uFEFF'); // BOM
      
      const csvData = detections.map(d => ({
        data_titular: d.titular,
        tipo_documento: d.documento,
        valor_mascarado: d.valor.substring(0, 10) + '***',
        nivel_risco: d.riskLevel,
        pontuacao_sensibilidade: d.sensitivityScore,
        confianca_ia: d.aiConfidence,
        arquivo: d.arquivo,
        contexto: d.context,
        timestamp: d.timestamp.toISOString(),
        zip_source: d.file?.zipSource
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

export default router;
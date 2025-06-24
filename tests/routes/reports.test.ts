/**
 * Reports API Tests
 * Tests for LGPD compliance reporting endpoints
 */

import request from 'supertest';
import express from 'express';
import reportsRouter from '../../src/routes/reports';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/api/v1/reports', reportsRouter);

const prisma = new PrismaClient();

describe('Reports API', () => {
  beforeEach(async () => {
    // Clean up test data
    await prisma.detection.deleteMany();
    await prisma.file.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/reports/lgpd/titulares', () => {
    beforeEach(async () => {
      // Create test data
      const testFile = await prisma.file.create({
        data: {
          filename: 'test.txt',
          originalName: 'test.txt',
          zipSource: 'test.zip',
          mimeType: 'text/plain',
          size: 1024,
          sessionId: 'test-session',
        }
      });

      // Create test detections
      await prisma.detection.createMany({
        data: [
          {
            titular: 'João Silva',
            documento: 'CPF',
            valor: '123.456.789-00',
            arquivo: 'test.txt',
            fileId: testFile.id,
            riskLevel: 'high',
            context: 'João Silva tem CPF 123.456.789-00',
            position: 15,
          },
          {
            titular: 'Maria Santos',
            documento: 'Email',
            valor: 'maria@empresa.com.br',
            arquivo: 'test.txt',
            fileId: testFile.id,
            riskLevel: 'medium',
            context: 'Email: maria@empresa.com.br',
            position: 50,
          }
        ]
      });
    });

    test('should return titulares report in JSON format', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares')
        .expect(200);

      expect(response.body.message).toBe('LGPD titulares report generated successfully');
      expect(response.body.titulares).toHaveLength(2);
      expect(response.body.summary.totalTitulares).toBe(2);
    });

    test('should filter by domain parameter', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares?domain=empresa.com.br')
        .expect(200);

      expect(response.body.titulares.length).toBeGreaterThan(0);
      expect(response.body.filters.domain).toBe('empresa.com.br');
    });

    test('should filter by documento type', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares?documento=CPF')
        .expect(200);

      expect(response.body.titulares).toHaveLength(1);
      expect(response.body.titulares[0].documento).toBe('CPF');
    });

    test('should filter by risk level', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares?riskLevel=high')
        .expect(200);

      expect(response.body.titulares).toHaveLength(1);
      expect(response.body.titulares[0].arquivos[0].riskLevel).toBe('high');
    });

    test('should return CSV format when requested', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('titular,documento,valor_mascarado');
    });

    test('should mask sensitive data in response', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares')
        .expect(200);

      const cpfTitular = response.body.titulares.find((t: any) => t.documento === 'CPF');
      expect(cpfTitular.valor).toMatch(/\*\*\*$/); // Should end with ***
      expect(cpfTitular.valor).not.toBe('123.456.789-00'); // Should not show full value
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares?limit=1&offset=0')
        .expect(200);

      expect(response.body.titulares).toHaveLength(1);
    });
  });

  describe('GET /api/v1/reports/lgpd/consolidado', () => {
    beforeEach(async () => {
      // Create comprehensive test data
      const testFile = await prisma.file.create({
        data: {
          filename: 'consolidated_test.txt',
          originalName: 'consolidated_test.txt',
          zipSource: 'consolidated.zip',
          mimeType: 'text/plain',
          size: 2048,
          sessionId: 'consolidated-session',
        }
      });

      await prisma.detection.createMany({
        data: [
          {
            titular: 'João Silva',
            documento: 'CPF',
            valor: '111.111.111-11',
            arquivo: 'consolidated_test.txt',
            fileId: testFile.id,
            riskLevel: 'critical',
            context: 'Confidential CPF: 111.111.111-11',
            position: 10,
            sensitivityScore: 9,
            aiConfidence: 0.95,
          },
          {
            titular: 'Maria Santos',
            documento: 'Email',
            valor: 'maria@test.com',
            arquivo: 'consolidated_test.txt',
            fileId: testFile.id,
            riskLevel: 'medium',
            context: 'Contact: maria@test.com',
            position: 40,
            sensitivityScore: 5,
            aiConfidence: 0.8,
          },
          {
            titular: 'Pedro Oliveira',
            documento: 'Telefone',
            valor: '(11) 99999-9999',
            arquivo: 'consolidated_test.txt',
            fileId: testFile.id,
            riskLevel: 'low',
            context: 'Phone: (11) 99999-9999',
            position: 70,
            sensitivityScore: 3,
            aiConfidence: 0.7,
          }
        ]
      });
    });

    test('should return consolidated LGPD report', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/consolidado')
        .expect(200);

      expect(response.body.message).toBe('LGPD consolidated report generated successfully');
      expect(response.body.report.summary.totalDetections).toBe(3);
      expect(response.body.report.summary.uniqueDataSubjects).toBe(3);
      expect(response.body.report.summary.complianceScore).toBeDefined();
    });

    test('should calculate compliance score correctly', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/consolidado')
        .expect(200);

      const report = response.body.report;
      
      // Should have penalty for critical and medium risk detections
      expect(report.summary.complianceScore).toBeLessThan(100);
      expect(report.summary.highRiskCount).toBe(1); // 1 critical detection
    });

    test('should include risk distribution', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/consolidado')
        .expect(200);

      const riskDistribution = response.body.report.riskDistribution;
      
      expect(riskDistribution.critical).toBe(1);
      expect(riskDistribution.medium).toBe(1);
      expect(riskDistribution.low).toBe(1);
    });

    test('should include type distribution', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/consolidado')
        .expect(200);

      const typeDistribution = response.body.report.typeDistribution;
      
      expect(typeDistribution.CPF).toBe(1);
      expect(typeDistribution.Email).toBe(1);
      expect(typeDistribution.Telefone).toBe(1);
    });

    test('should include top risks with masked data', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/consolidado')
        .expect(200);

      const topRisks = response.body.report.topRisks;
      
      expect(topRisks).toHaveLength(1); // Only critical/high risks
      expect(topRisks[0].valor).toMatch(/\*\*\*$/); // Masked value
      expect(topRisks[0].riskLevel).toBe('critical');
    });

    test('should support date range filtering', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const response = await request(app)
        .get(`/api/v1/reports/lgpd/consolidado?startDate=${yesterday}&endDate=${tomorrow}`)
        .expect(200);

      expect(response.body.report.period.start).toBe(yesterday);
      expect(response.body.report.period.end).toBe(tomorrow);
    });

    test('should return CSV format with BOM', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/consolidado?format=csv')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      
      // Check for BOM (UTF-8 Byte Order Mark)
      expect(response.text.charCodeAt(0)).toBe(0xFEFF);
      expect(response.text).toContain('data_titular,tipo_documento');
    });

    test('should include LGPD recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/consolidado')
        .expect(200);

      const recommendations = response.body.report.recommendations;
      
      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some((r: string) => r.includes('data masking'))).toBe(true);
      expect(recommendations.some((r: string) => r.includes('LGPD'))).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Disconnect database to simulate error
      await prisma.$disconnect();
      
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares')
        .expect(500);

      expect(response.body.error).toBe('Internal Server Error');
      expect(response.body.message).toBe('Failed to generate LGPD titulares report');
      
      // Reconnect for cleanup
      await prisma.$connect();
    });

    test('should validate query parameters', async () => {
      const response = await request(app)
        .get('/api/v1/reports/lgpd/titulares?limit=invalid')
        .expect(200); // Should handle gracefully with default values

      expect(response.body.titulares).toBeDefined();
    });
  });
});
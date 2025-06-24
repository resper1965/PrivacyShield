/**
 * LGPD Reports Generator
 * Consolidated reports for LGPD compliance and privacy assessment
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { directoryMonitor } from '../monitoring/directoryWatcher';

export interface LGPDReport {
  id: string;
  title: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalFilesScanned: number;
    totalPIIDetections: number;
    highRiskDetections: number;
    criticalRiskDetections: number;
    watchedDirectories: number;
    complianceScore: number; // 0-100
  };
  detectionsByType: Record<string, number>;
  riskDistribution: Record<string, number>;
  dataSubjects: Array<{
    titular: string;
    detectionCount: number;
    riskLevel: string;
    dataTypes: string[];
    locations: string[];
    recommendations: string[];
  }>;
  complianceFindings: Array<{
    finding: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    remediation: string;
    lgpdArticle?: string;
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    timeline: string;
    impact: string;
  }>;
}

export interface MonthlyTrend {
  month: string;
  detectionsCount: number;
  riskScore: number;
  newDataSubjects: number;
  complianceScore: number;
}

class LGPDReportGenerator {
  private reportsPath = path.join(process.cwd(), 'reports', 'lgpd');

  constructor() {
    this.ensureReportsDirectory();
  }

  /**
   * Generate comprehensive LGPD compliance report
   */
  async generateComplianceReport(
    startDate: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: Date = new Date()
  ): Promise<LGPDReport> {
    console.log('📊 Generating LGPD compliance report...');

    const reportId = `lgpd_${Date.now()}`;
    const detectionsData = await this.getDetectionsInPeriod(startDate, endDate);
    
    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(detectionsData);
    
    // Analyze detections by type
    const detectionsByType = this.analyzeDetectionsByType(detectionsData);
    
    // Calculate risk distribution
    const riskDistribution = this.calculateRiskDistribution(detectionsData);
    
    // Identify data subjects
    const dataSubjects = this.identifyDataSubjects(detectionsData);
    
    // Generate compliance findings
    const complianceFindings = this.generateComplianceFindings(detectionsData, summary);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, complianceFindings);

    const report: LGPDReport = {
      id: reportId,
      title: `LGPD Compliance Report - ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      generatedAt: new Date(),
      period: { start: startDate, end: endDate },
      summary,
      detectionsByType,
      riskDistribution,
      dataSubjects,
      complianceFindings,
      recommendations
    };

    await this.saveReport(report);
    console.log(`✅ LGPD report generated: ${reportId}`);
    
    return report;
  }

  /**
   * Generate monthly trend analysis
   */
  async generateMonthlyTrends(months: number = 12): Promise<MonthlyTrend[]> {
    const trends: MonthlyTrend[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const detectionsData = await this.getDetectionsInPeriod(monthStart, monthEnd);
      const summary = this.calculateSummaryMetrics(detectionsData);
      
      trends.push({
        month: monthStart.toISOString().substr(0, 7), // YYYY-MM format
        detectionsCount: summary.totalPIIDetections,
        riskScore: this.calculateAverageRiskScore(detectionsData),
        newDataSubjects: this.countNewDataSubjects(detectionsData, monthStart),
        complianceScore: summary.complianceScore
      });
    }

    return trends;
  }

  /**
   * Generate executive summary report
   */
  async generateExecutiveSummary(): Promise<{
    keyMetrics: {
      totalDataSubjects: number;
      totalPIIDetections: number;
      averageRiskScore: number;
      complianceScore: number;
    };
    topRisks: string[];
    actionItems: string[];
    lgpdCompliance: {
      articlesAtRisk: string[];
      recommendedActions: string[];
    };
  }> {
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    const detectionsData = await this.getDetectionsInPeriod(lastMonth, now);
    const summary = this.calculateSummaryMetrics(detectionsData);
    const complianceFindings = this.generateComplianceFindings(detectionsData, summary);

    return {
      keyMetrics: {
        totalDataSubjects: this.identifyDataSubjects(detectionsData).length,
        totalPIIDetections: summary.totalPIIDetections,
        averageRiskScore: this.calculateAverageRiskScore(detectionsData),
        complianceScore: summary.complianceScore
      },
      topRisks: complianceFindings
        .filter(f => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5)
        .map(f => f.finding),
      actionItems: this.generateRecommendations(summary, complianceFindings)
        .filter(r => r.priority === 'high')
        .slice(0, 3)
        .map(r => r.action),
      lgpdCompliance: {
        articlesAtRisk: complianceFindings
          .filter(f => f.lgpdArticle)
          .map(f => f.lgpdArticle!)
          .filter((article, index, arr) => arr.indexOf(article) === index),
        recommendedActions: [
          'Implement data minimization practices',
          'Enhance consent management procedures',
          'Strengthen data subject rights processes',
          'Improve data security measures'
        ]
      }
    };
  }

  /**
   * Get detections data for a specific period
   */
  private async getDetectionsInPeriod(startDate: Date, endDate: Date): Promise<any[]> {
    // Simulate detection data - in real implementation, this would query the database
    const mockDetections = [
      {
        id: 1,
        titular: 'João Silva',
        documento: 'CPF',
        valor: '123.456.789-01',
        arquivo: 'documento1.txt',
        timestamp: new Date('2025-06-20'),
        riskLevel: 'high',
        sensitivityScore: 8,
        directory: '/watched/dir1'
      },
      {
        id: 2,
        titular: 'Maria Santos',
        documento: 'Email',
        valor: 'maria@empresa.com',
        arquivo: 'lista_clientes.csv',
        timestamp: new Date('2025-06-22'),
        riskLevel: 'medium',
        sensitivityScore: 5,
        directory: '/watched/dir2'
      },
      {
        id: 3,
        titular: 'Pedro Costa',
        documento: 'CNPJ',
        valor: '12.345.678/0001-90',
        arquivo: 'contratos.txt',
        timestamp: new Date('2025-06-23'),
        riskLevel: 'medium',
        sensitivityScore: 6,
        directory: '/watched/dir1'
      }
    ];

    return mockDetections.filter(d => 
      d.timestamp >= startDate && d.timestamp <= endDate
    );
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(detectionsData: any[]): LGPDReport['summary'] {
    const totalDetections = detectionsData.length;
    const highRiskCount = detectionsData.filter(d => d.riskLevel === 'high').length;
    const criticalRiskCount = detectionsData.filter(d => d.riskLevel === 'critical').length;
    
    // Calculate compliance score based on risk distribution and detection patterns
    const complianceScore = Math.max(0, 100 - (highRiskCount * 10) - (criticalRiskCount * 20));

    return {
      totalFilesScanned: detectionsData.length > 0 ? 50 : 0, // Mock value
      totalPIIDetections: totalDetections,
      highRiskDetections: highRiskCount,
      criticalRiskDetections: criticalRiskCount,
      watchedDirectories: directoryMonitor.getWatchedDirectories().length,
      complianceScore: Math.round(complianceScore)
    };
  }

  /**
   * Analyze detections by type
   */
  private analyzeDetectionsByType(detectionsData: any[]): Record<string, number> {
    const byType: Record<string, number> = {};
    
    detectionsData.forEach(detection => {
      byType[detection.documento] = (byType[detection.documento] || 0) + 1;
    });

    return byType;
  }

  /**
   * Calculate risk distribution
   */
  private calculateRiskDistribution(detectionsData: any[]): Record<string, number> {
    const distribution: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };

    detectionsData.forEach(detection => {
      distribution[detection.riskLevel] = (distribution[detection.riskLevel] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Identify data subjects
   */
  private identifyDataSubjects(detectionsData: any[]): LGPDReport['dataSubjects'] {
    const subjectsMap = new Map<string, any>();

    detectionsData.forEach(detection => {
      const existing = subjectsMap.get(detection.titular);
      
      if (existing) {
        existing.detectionCount++;
        existing.dataTypes.add(detection.documento);
        existing.locations.add(detection.directory);
      } else {
        subjectsMap.set(detection.titular, {
          titular: detection.titular,
          detectionCount: 1,
          riskLevel: detection.riskLevel,
          dataTypes: new Set([detection.documento]),
          locations: new Set([detection.directory]),
          recommendations: this.getDataSubjectRecommendations(detection.riskLevel)
        });
      }
    });

    return Array.from(subjectsMap.values()).map(subject => ({
      ...subject,
      dataTypes: Array.from(subject.dataTypes),
      locations: Array.from(subject.locations)
    }));
  }

  /**
   * Generate compliance findings
   */
  private generateComplianceFindings(detectionsData: any[], summary: any): LGPDReport['complianceFindings'] {
    const findings: LGPDReport['complianceFindings'] = [];

    if (summary.criticalRiskDetections > 0) {
      findings.push({
        finding: 'Critical Risk PII Detected',
        severity: 'critical',
        description: `${summary.criticalRiskDetections} critical risk PII detections found`,
        remediation: 'Immediate action required to secure or remove critical PII data',
        lgpdArticle: 'Art. 46 - Data Security'
      });
    }

    if (summary.highRiskDetections > 5) {
      findings.push({
        finding: 'High Volume of High-Risk Detections',
        severity: 'high',
        description: `${summary.highRiskDetections} high-risk PII detections indicate potential data exposure`,
        remediation: 'Implement data classification and access controls',
        lgpdArticle: 'Art. 7 - Data Processing Principles'
      });
    }

    if (summary.complianceScore < 70) {
      findings.push({
        finding: 'Low Compliance Score',
        severity: 'medium',
        description: `Compliance score of ${summary.complianceScore}% indicates areas for improvement`,
        remediation: 'Review data handling practices and implement recommended security measures',
        lgpdArticle: 'Art. 50 - Data Protection Officer'
      });
    }

    return findings;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(summary: any, findings: any[]): LGPDReport['recommendations'] {
    const recommendations: LGPDReport['recommendations'] = [];

    if (summary.criticalRiskDetections > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Secure Critical PII Data',
        description: 'Immediately secure or remove critical risk PII detections',
        timeline: 'Within 24 hours',
        impact: 'Reduces legal liability and data breach risk'
      });
    }

    if (summary.highRiskDetections > 0) {
      recommendations.push({
        priority: 'high',
        action: 'Implement Data Masking',
        description: 'Mask or encrypt high-risk PII in non-production environments',
        timeline: 'Within 1 week',
        impact: 'Improves data protection and LGPD compliance'
      });
    }

    recommendations.push({
      priority: 'medium',
      action: 'Establish Data Governance',
      description: 'Create formal data governance policies and procedures',
      timeline: 'Within 1 month',
      impact: 'Ensures ongoing LGPD compliance and risk management'
    });

    return recommendations;
  }

  /**
   * Get recommendations for data subjects
   */
  private getDataSubjectRecommendations(riskLevel: string): string[] {
    switch (riskLevel) {
      case 'critical':
        return ['Immediate data review required', 'Consider data deletion', 'Legal review recommended'];
      case 'high':
        return ['Enhanced access controls', 'Regular audit scheduling', 'Consent verification'];
      case 'medium':
        return ['Standard monitoring', 'Periodic review', 'Access logging'];
      default:
        return ['Basic monitoring', 'Annual review'];
    }
  }

  /**
   * Calculate average risk score
   */
  private calculateAverageRiskScore(detectionsData: any[]): number {
    if (detectionsData.length === 0) return 0;
    
    const totalScore = detectionsData.reduce((sum, d) => sum + (d.sensitivityScore || 5), 0);
    return Math.round((totalScore / detectionsData.length) * 10); // Scale to 0-100
  }

  /**
   * Count new data subjects in period
   */
  private countNewDataSubjects(detectionsData: any[], periodStart: Date): number {
    const uniqueSubjects = new Set(detectionsData.map(d => d.titular));
    return uniqueSubjects.size; // Simplified - in real implementation, would compare with historical data
  }

  /**
   * Save report to file
   */
  private async saveReport(report: LGPDReport): Promise<void> {
    const filename = `${report.id}.json`;
    const filepath = path.join(this.reportsPath, filename);
    
    await fs.writeJson(filepath, report, { spaces: 2 });
    
    // Also save as HTML for easy viewing
    const htmlContent = this.generateHTMLReport(report);
    const htmlPath = path.join(this.reportsPath, `${report.id}.html`);
    await fs.writeFile(htmlPath, htmlContent);
  }

  /**
   * Generate HTML version of report
   */
  private generateHTMLReport(report: LGPDReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; }
        .section { margin: 30px 0; }
        .metric { display: inline-block; margin: 10px 20px; padding: 15px; background: #f5f5f5; border-radius: 5px; }
        .finding { margin: 10px 0; padding: 15px; border-left: 4px solid #dc3545; background: #fff3cd; }
        .recommendation { margin: 10px 0; padding: 15px; border-left: 4px solid #28a745; background: #d4edda; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p>Generated: ${report.generatedAt.toISOString()}</p>
        <p>Period: ${report.period.start.toISOString().split('T')[0]} to ${report.period.end.toISOString().split('T')[0]}</p>
    </div>

    <div class="section">
        <h2>Executive Summary</h2>
        <div class="metric">
            <strong>Files Scanned:</strong> ${report.summary.totalFilesScanned}
        </div>
        <div class="metric">
            <strong>PII Detections:</strong> ${report.summary.totalPIIDetections}
        </div>
        <div class="metric">
            <strong>High Risk:</strong> ${report.summary.highRiskDetections}
        </div>
        <div class="metric">
            <strong>Compliance Score:</strong> ${report.summary.complianceScore}%
        </div>
    </div>

    <div class="section">
        <h2>Risk Distribution</h2>
        <table>
            <tr><th>Risk Level</th><th>Count</th></tr>
            ${Object.entries(report.riskDistribution).map(([level, count]) => 
                `<tr><td>${level}</td><td>${count}</td></tr>`
            ).join('')}
        </table>
    </div>

    <div class="section">
        <h2>Compliance Findings</h2>
        ${report.complianceFindings.map(finding => `
            <div class="finding">
                <h4>${finding.finding} (${finding.severity})</h4>
                <p>${finding.description}</p>
                <p><strong>Remediation:</strong> ${finding.remediation}</p>
                ${finding.lgpdArticle ? `<p><strong>LGPD Article:</strong> ${finding.lgpdArticle}</p>` : ''}
            </div>
        `).join('')}
    </div>

    <div class="section">
        <h2>Recommendations</h2>
        ${report.recommendations.map(rec => `
            <div class="recommendation">
                <h4>${rec.action} (${rec.priority} priority)</h4>
                <p>${rec.description}</p>
                <p><strong>Timeline:</strong> ${rec.timeline}</p>
                <p><strong>Impact:</strong> ${rec.impact}</p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  /**
   * Ensure reports directory exists
   */
  private async ensureReportsDirectory(): Promise<void> {
    await fs.ensureDir(this.reportsPath);
  }

  /**
   * List all available reports
   */
  async listReports(): Promise<Array<{ id: string; title: string; generatedAt: Date }>> {
    const files = await fs.readdir(this.reportsPath);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const reports = [];
    for (const file of jsonFiles) {
      try {
        const report = await fs.readJson(path.join(this.reportsPath, file));
        reports.push({
          id: report.id,
          title: report.title,
          generatedAt: new Date(report.generatedAt)
        });
      } catch (error) {
        console.error(`Failed to read report ${file}:`, error);
      }
    }
    
    return reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
  }

  /**
   * Get specific report
   */
  async getReport(reportId: string): Promise<LGPDReport | null> {
    try {
      const filepath = path.join(this.reportsPath, `${reportId}.json`);
      const report = await fs.readJson(filepath);
      return {
        ...report,
        generatedAt: new Date(report.generatedAt),
        period: {
          start: new Date(report.period.start),
          end: new Date(report.period.end)
        }
      };
    } catch (error) {
      return null;
    }
  }
}

export const lgpdReportGenerator = new LGPDReportGenerator();
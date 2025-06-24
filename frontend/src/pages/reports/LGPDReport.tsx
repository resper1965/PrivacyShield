import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, Users, Shield } from 'lucide-react';

interface LGPDReport {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalDetections: number;
    uniqueDataSubjects: number;
    uniqueFiles: number;
    complianceScore: number;
    highRiskCount: number;
    avgDetectionsPerFile: number;
  };
  riskDistribution: Record<string, number>;
  typeDistribution: Record<string, number>;
  topRisks: Array<{
    titular: string;
    documento: string;
    valor: string;
    arquivo: string;
    riskLevel: string;
    context: string;
    reasoning: string;
  }>;
  recommendations: string[];
  generatedAt: string;
}

export const LGPDReport: React.FC = () => {
  const [report, setReport] = useState<LGPDReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchLGPDReport();
  }, [dateRange]);

  const fetchLGPDReport = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: 'json'
      });

      const response = await fetch(`/api/v1/reports/lgpd/consolidado?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setReport(data.report);
      } else {
        console.error('Error fetching LGPD report:', data.message);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching LGPD report:', error);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      format: 'csv'
    });
    
    window.open(`/api/v1/reports/lgpd/consolidado?${params}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getComplianceLabel = (score: number) => {
    if (score >= 90) return 'Excelente';
    if (score >= 70) return 'Bom';
    if (score >= 50) return 'Regular';
    return 'Crítico';
  };

  const getRiskColor = (riskLevel: string) => {
    const colors = {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500'
    };
    return colors[riskLevel as keyof typeof colors] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Erro ao carregar relatório
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tente novamente em alguns instantes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Relatório LGPD Consolidado
        </h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Período: {formatDate(report.period.start)} - {formatDate(report.period.end)}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de Documentos
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {report.summary.totalDetections.toLocaleString()}
              </p>
            </div>
            <FileText className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Titulares Únicos
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {report.summary.uniqueDataSubjects.toLocaleString()}
              </p>
            </div>
            <Users className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Score de Conformidade
              </p>
              <p className={`text-3xl font-bold ${getComplianceColor(report.summary.complianceScore)}`}>
                {report.summary.complianceScore}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getComplianceLabel(report.summary.complianceScore)}
              </p>
            </div>
            <Shield className="h-12 w-12 text-purple-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Distribuição por Nível de Risco
          </h3>
          <div className="space-y-3">
            {Object.entries(report.riskDistribution).map(([level, count]) => {
              const total = Object.values(report.riskDistribution).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={level} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {level}
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full ${getRiskColor(level)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="w-16 text-sm text-gray-600 dark:text-gray-400 text-right">
                    {count} ({Math.round(percentage)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Type Distribution */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distribuição por Tipo de Dado
          </h3>
          <div className="space-y-3">
            {Object.entries(report.typeDistribution).map(([type, count]) => {
              const total = Object.values(report.typeDistribution).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {type}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                      {count}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Risks */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Principais Riscos Identificados
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Titular
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Risco
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Arquivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contexto
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {report.topRisks.map((risk, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {risk.titular}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {risk.documento}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                    {risk.valor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      risk.riskLevel === 'critical' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200'
                    }`}>
                      {risk.riskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {risk.arquivo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                    <span className="line-clamp-2">
                      {risk.context}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recomendações de Conformidade LGPD
        </h3>
        <ul className="space-y-2">
          {report.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {recommendation}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Report Metadata */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
        Relatório gerado em: {new Date(report.generatedAt).toLocaleString('pt-BR')}
      </div>
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, Flag, Search, Filter, Eye } from 'lucide-react';

interface Detection {
  id: string;
  type: string; // CPF, CNPJ, Email, etc.
  value: string; // Masked value
  context: string; // Semantic context
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  sourceFile: string;
  isFalsePositive: boolean;
  timestamp: string;
  titular: string;
}

export const Detections: React.FC = () => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    riskLevel: '',
    semanticLike: '',
    falsePositive: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDetections, setSelectedDetections] = useState<string[]>([]);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchDetections();
  }, [currentPage, filters]);

  const fetchDetections = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from /api/v1/reports/detections
      const mockDetections: Detection[] = [
        {
          id: '1',
          type: 'CPF',
          value: '123.456.***-**',
          context: 'João Silva tem CPF 123.456.789-00 e mora em São Paulo.',
          riskLevel: 'high',
          sourceFile: 'customer_data.txt',
          isFalsePositive: false,
          timestamp: '2025-06-24T01:00:00Z',
          titular: 'João Silva'
        },
        {
          id: '2',
          type: 'Email',
          value: 'maria@empresa***',
          context: 'Contato: maria@empresa.com.br para dúvidas.',
          riskLevel: 'medium',
          sourceFile: 'contacts.txt',
          isFalsePositive: false,
          timestamp: '2025-06-24T00:45:00Z',
          titular: 'Maria Santos'
        },
        {
          id: '3',
          type: 'CNPJ',
          value: '12.345.678/****-**',
          context: 'Empresa ABC LTDA, CNPJ 12.345.678/0001-00',
          riskLevel: 'medium',
          sourceFile: 'companies.txt',
          isFalsePositive: true,
          timestamp: '2025-06-24T00:30:00Z',
          titular: 'Empresa ABC LTDA'
        },
        {
          id: '4',
          type: 'Telefone',
          value: '(11) 9****-****',
          context: 'Telefone para contato: (11) 99999-9999',
          riskLevel: 'low',
          sourceFile: 'contacts.txt',
          isFalsePositive: false,
          timestamp: '2025-06-24T00:15:00Z',
          titular: 'Contato Geral'
        },
        {
          id: '5',
          type: 'CPF',
          value: '987.654.***-**',
          context: 'Documento confidencial: CPF 987.654.321-11',
          riskLevel: 'critical',
          sourceFile: 'confidential_backup.sql',
          isFalsePositive: false,
          timestamp: '2025-06-23T23:45:00Z',
          titular: 'Pedro Oliveira'
        }
      ];

      // Apply filters
      let filteredDetections = mockDetections;
      
      if (filters.type) {
        filteredDetections = filteredDetections.filter(d => d.type === filters.type);
      }
      
      if (filters.riskLevel) {
        filteredDetections = filteredDetections.filter(d => d.riskLevel === filters.riskLevel);
      }
      
      if (filters.semanticLike) {
        filteredDetections = filteredDetections.filter(d => 
          d.context.toLowerCase().includes(filters.semanticLike.toLowerCase()) ||
          d.titular.toLowerCase().includes(filters.semanticLike.toLowerCase())
        );
      }
      
      if (filters.falsePositive !== 'all') {
        const isFalsePositive = filters.falsePositive === 'true';
        filteredDetections = filteredDetections.filter(d => d.isFalsePositive === isFalsePositive);
      }

      setDetections(filteredDetections);
      setTotalPages(Math.ceil(filteredDetections.length / itemsPerPage));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching detections:', error);
      setLoading(false);
    }
  };

  const handleFlagFalsePositive = async (detectionId: string) => {
    try {
      // API call to flag as false positive
      const response = await fetch(`/api/detections/${detectionId}/flag`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFalsePositive: true })
      });

      if (response.ok) {
        setDetections(detections.map(d => 
          d.id === detectionId ? { ...d, isFalsePositive: true } : d
        ));
      }
    } catch (error) {
      console.error('Error flagging detection:', error);
    }
  };

  const handleExportCSV = () => {
    // Build query parameters based on current filters
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
    if (filters.semanticLike) params.append('semanticLike', filters.semanticLike);
    if (filters.falsePositive !== 'all') params.append('falsePositive', filters.falsePositive);
    params.append('format', 'csv');

    // In real implementation, this would trigger download from API
    window.open(`/api/v1/reports/detections?${params.toString()}`);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getRiskBadge = (riskLevel: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[riskLevel as keyof typeof colors]}`}>
        {riskLevel.toUpperCase()}
      </span>
    );
  };

  const getTypeIcon = (type: string) => {
    // Simple icon mapping - could be enhanced
    return <AlertTriangle size={16} className="text-gray-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Detecções de PII
        </h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="Email">Email</option>
              <option value="Telefone">Telefone</option>
              <option value="RG">RG</option>
              <option value="CEP">CEP</option>
              <option value="Nome Completo">Nome Completo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nível de Risco
            </label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="low">Baixo</option>
              <option value="medium">Médio</option>
              <option value="high">Alto</option>
              <option value="critical">Crítico</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Busca Semântica
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.semanticLike}
                onChange={(e) => setFilters(prev => ({ ...prev, semanticLike: e.target.value }))}
                placeholder="Buscar no contexto..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Falso Positivo
            </label>
            <select
              value={filters.falsePositive}
              onChange={(e) => setFilters(prev => ({ ...prev, falsePositive: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Todos</option>
              <option value="false">Válidos</option>
              <option value="true">Falsos Positivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detections Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contexto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Risco
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Arquivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {detections.map((detection) => (
                <tr key={detection.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(detection.type)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {detection.type}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {detection.value}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs">
                      <span className="line-clamp-2">
                        {detection.context}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRiskBadge(detection.riskLevel)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {detection.sourceFile}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {detection.isFalsePositive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        Falso Positivo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                        Válido
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {!detection.isFalsePositive && (
                        <button
                          onClick={() => handleFlagFalsePositive(detection.id)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          title="Marcar como falso positivo"
                        >
                          <Flag size={16} />
                        </button>
                      )}
                      <button
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando {detections.length} detecções - Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {detections.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhuma detecção encontrada
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ajuste os filtros ou faça novos uploads para ver detecções de PII.
          </p>
        </div>
      )}
    </div>
  );
};
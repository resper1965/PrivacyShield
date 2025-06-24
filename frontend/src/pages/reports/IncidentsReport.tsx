import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, Calendar, Flag, CheckCircle, XCircle } from 'lucide-react';

interface IncidentData {
  id: string;
  type: 'incident' | 'false_positive';
  detectionId: string;
  titular: string;
  documento: string;
  valor: string;
  arquivo: string;
  riskLevel: string;
  reportedAt: string;
  reportedBy: string;
  status: 'open' | 'reviewed' | 'resolved';
  notes?: string;
  resolution?: string;
}

export const IncidentsReport: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: '',
    riskLevel: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchIncidentsData();
  }, [filters, currentPage]);

  const fetchIncidentsData = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from API
      const mockIncidents: IncidentData[] = [
        {
          id: 'INC001',
          type: 'incident',
          detectionId: 'DET_001',
          titular: 'João Silva',
          documento: 'CPF',
          valor: '123.456.***-**',
          arquivo: 'confidential_backup.sql',
          riskLevel: 'critical',
          reportedAt: '2025-06-24T01:00:00Z',
          reportedBy: 'admin@empresa.com',
          status: 'open',
          notes: 'CPF encontrado em backup de produção sem autorização'
        },
        {
          id: 'FP001',
          type: 'false_positive',
          detectionId: 'DET_002',
          titular: 'Maria Santos',
          documento: 'CPF',
          valor: '111.111.***-**',
          arquivo: 'test_data.txt',
          riskLevel: 'high',
          reportedAt: '2025-06-23T15:30:00Z',
          reportedBy: 'analista@empresa.com',
          status: 'reviewed',
          notes: 'CPF de teste usado em documentação',
          resolution: 'Confirmado como falso positivo - dados de teste'
        },
        {
          id: 'INC002',
          type: 'incident',
          detectionId: 'DET_003',
          titular: 'Pedro Oliveira',
          documento: 'Email',
          valor: 'pedro@***',
          arquivo: 'logs_sistema.txt',
          riskLevel: 'medium',
          reportedAt: '2025-06-23T10:15:00Z',
          reportedBy: 'security@empresa.com',
          status: 'resolved',
          notes: 'Email pessoal em logs do sistema',
          resolution: 'Logs foram sanitizados e procedimento de coleta atualizado'
        },
        {
          id: 'FP002',
          type: 'false_positive',
          detectionId: 'DET_004',
          titular: 'Empresa ABC',
          documento: 'CNPJ',
          valor: '12.345.***/***/***',
          arquivo: 'documentacao_api.md',
          riskLevel: 'low',
          reportedAt: '2025-06-22T14:20:00Z',
          reportedBy: 'dev@empresa.com',
          status: 'resolved',
          notes: 'CNPJ fictício usado em documentação da API',
          resolution: 'Adicionado à lista de exclusões para documentação'
        },
        {
          id: 'INC003',
          type: 'incident',
          detectionId: 'DET_005',
          titular: 'Ana Costa',
          documento: 'Telefone',
          valor: '(11) 9****-****',
          arquivo: 'customer_support.csv',
          riskLevel: 'high',
          reportedAt: '2025-06-21T09:45:00Z',
          reportedBy: 'dpo@empresa.com',
          status: 'reviewed',
          notes: 'Dados de suporte ao cliente sem consentimento adequado'
        }
      ];

      // Apply filters
      let filteredIncidents = mockIncidents;
      
      if (filters.type) {
        filteredIncidents = filteredIncidents.filter(incident => incident.type === filters.type);
      }
      
      if (filters.status) {
        filteredIncidents = filteredIncidents.filter(incident => incident.status === filters.status);
      }
      
      if (filters.riskLevel) {
        filteredIncidents = filteredIncidents.filter(incident => incident.riskLevel === filters.riskLevel);
      }
      
      if (filters.startDate) {
        filteredIncidents = filteredIncidents.filter(incident => 
          new Date(incident.reportedAt) >= new Date(filters.startDate)
        );
      }
      
      if (filters.endDate) {
        filteredIncidents = filteredIncidents.filter(incident => 
          new Date(incident.reportedAt) <= new Date(filters.endDate)
        );
      }

      setIncidents(filteredIncidents);
      setTotalPages(Math.ceil(filteredIncidents.length / itemsPerPage));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incidents data:', error);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['ID', 'Tipo', 'Titular', 'Documento', 'Valor', 'Arquivo', 'Risco', 'Reportado em', 'Reportado por', 'Status', 'Observações', 'Resolução'];
    
    const csvContent = [
      headers.join(','),
      ...incidents.map(incident => [
        incident.id,
        incident.type === 'incident' ? 'Incidente' : 'Falso Positivo',
        `"${incident.titular}"`,
        incident.documento,
        `"${incident.valor}"`,
        `"${incident.arquivo}"`,
        incident.riskLevel,
        new Date(incident.reportedAt).toLocaleDateString('pt-BR'),
        `"${incident.reportedBy}"`,
        incident.status,
        `"${incident.notes || ''}"`,
        `"${incident.resolution || ''}"`
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_incidentes.csv';
    link.click();
  };

  const handleStatusUpdate = async (incidentId: string, newStatus: string) => {
    try {
      // In real implementation, call API to update status
      setIncidents(incidents.map(incident => 
        incident.id === incidentId ? { ...incident, status: newStatus as any } : incident
      ));
    } catch (error) {
      console.error('Error updating incident status:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getTypeIcon = (type: string) => {
    return type === 'incident' 
      ? <AlertTriangle className="h-4 w-4 text-red-500" />
      : <Flag className="h-4 w-4 text-yellow-500" />;
  };

  const getTypeLabel = (type: string) => {
    return type === 'incident' ? 'Incidente' : 'Falso Positivo';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'reviewed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      open: 'Aberto',
      reviewed: 'Revisado',
      resolved: 'Resolvido'
    };
    return labels[status as keyof typeof labels] || status;
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
          Incidentes & Falsos Positivos
        </h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de Incidentes
              </p>
              <p className="text-2xl font-bold text-red-600">
                {incidents.filter(i => i.type === 'incident').length}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Falsos Positivos
              </p>
              <p className="text-2xl font-bold text-yellow-600">
                {incidents.filter(i => i.type === 'false_positive').length}
              </p>
            </div>
            <Flag className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Abertos
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {incidents.filter(i => i.status === 'open').length}
              </p>
            </div>
            <XCircle className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Resolvidos
              </p>
              <p className="text-2xl font-bold text-green-600">
                {incidents.filter(i => i.status === 'resolved').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <option value="incident">Incidentes</option>
              <option value="false_positive">Falsos Positivos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="open">Aberto</option>
              <option value="reviewed">Revisado</option>
              <option value="resolved">Resolvido</option>
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
              <option value="critical">Crítico</option>
              <option value="high">Alto</option>
              <option value="medium">Médio</option>
              <option value="low">Baixo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Titular
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Risco
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reportado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {incidents.map((incident) => (
                <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {incident.id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(incident.type)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getTypeLabel(incident.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {incident.titular}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {incident.documento}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {incident.valor}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRiskBadge(incident.riskLevel)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(incident.status)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getStatusLabel(incident.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(incident.reportedAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {incident.status === 'open' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleStatusUpdate(incident.id, 'reviewed')}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Marcar como revisado"
                        >
                          <CheckCircle size={16} />
                        </button>
                      </div>
                    )}
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
                Página {currentPage} de {totalPages} - {incidents.length} registros
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

      {incidents.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhum incidente encontrado
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ajuste os filtros para ver incidentes específicos.
          </p>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Users, Download, Search, Filter } from 'lucide-react';

interface TitularData {
  titular: string;
  documento: string;
  valor: string; // Masked
  arquivos: Array<{
    nome: string;
    zipSource: string;
    uploadedAt: string;
    riskLevel: string;
    context: string;
  }>;
  detections: number;
  riskLevels: string[];
  highestRisk: string;
  lastDetection: number; // timestamp
}

interface TitularesReport {
  filters: {
    domain?: string;
    cnpj?: string;
    documento?: string;
    riskLevel?: string;
  };
  summary: {
    totalTitulares: number;
    totalDetections: number;
    criticalCount: number;
    highCount: number;
  };
  titulares: TitularData[];
}

export const TitularesReport: React.FC = () => {
  const [report, setReport] = useState<TitularesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    domain: '',
    cnpj: '',
    documento: '',
    riskLevel: '',
    groupBy: 'titular'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTitularesReport();
  }, [filters, currentPage]);

  const fetchTitularesReport = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.domain) params.append('domain', filters.domain);
      if (filters.cnpj) params.append('cnpj', filters.cnpj);
      if (filters.documento) params.append('documento', filters.documento);
      if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
      params.append('groupBy', filters.groupBy);
      params.append('limit', itemsPerPage.toString());
      params.append('offset', ((currentPage - 1) * itemsPerPage).toString());
      params.append('format', 'json');

      const response = await fetch(`/api/v1/reports/lgpd/titulares?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setReport(data);
        setTotalPages(Math.ceil(data.summary.totalTitulares / itemsPerPage));
      } else {
        console.error('Error fetching titulares report:', data.message);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching titulares report:', error);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (filters.domain) params.append('domain', filters.domain);
    if (filters.cnpj) params.append('cnpj', filters.cnpj);
    if (filters.documento) params.append('documento', filters.documento);
    if (filters.riskLevel) params.append('riskLevel', filters.riskLevel);
    params.append('groupBy', filters.groupBy);
    params.append('format', 'csv');
    
    window.open(`/api/v1/reports/lgpd/titulares?${params}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
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

  if (!report) {
    return (
      <div className="text-center py-12">
        <Users className="mx-auto h-12 w-12 text-gray-400" />
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
          Relatório por Titular
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Domínio de E-mail
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.domain}
                onChange={(e) => setFilters(prev => ({ ...prev, domain: e.target.value }))}
                placeholder="empresa.com.br"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CNPJ
            </label>
            <input
              type="text"
              value={filters.cnpj}
              onChange={(e) => setFilters(prev => ({ ...prev, cnpj: e.target.value }))}
              placeholder="12.345.678/0001-00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Documento
            </label>
            <select
              value={filters.documento}
              onChange={(e) => setFilters(prev => ({ ...prev, documento: e.target.value }))}
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
              Agrupar por
            </label>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters(prev => ({ ...prev, groupBy: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="titular">Titular</option>
              <option value="documento">Documento</option>
              <option value="riskLevel">Nível de Risco</option>
              <option value="arquivo">Arquivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de Titulares
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {report.summary.totalTitulares.toLocaleString()}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total de Detecções
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {report.summary.totalDetections.toLocaleString()}
              </p>
            </div>
            <Filter className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Risco Crítico
              </p>
              <p className="text-2xl font-bold text-red-600">
                {report.summary.criticalCount}
              </p>
            </div>
            <div className="w-8 h-8 bg-red-500 rounded"></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Risco Alto
              </p>
              <p className="text-2xl font-bold text-orange-600">
                {report.summary.highCount}
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-500 rounded"></div>
          </div>
        </div>
      </div>

      {/* Titulares Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
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
                  Detecções
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Maior Risco
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Arquivos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Última Detecção
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {report.titulares.map((titular, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {titular.titular}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                      {titular.documento}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {titular.valor}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {titular.detections}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRiskBadge(titular.highestRisk)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {titular.arquivos.length} arquivo(s)
                      <details className="mt-1">
                        <summary className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs">
                          Ver detalhes
                        </summary>
                        <div className="mt-2 space-y-1">
                          {titular.arquivos.slice(0, 3).map((arquivo, idx) => (
                            <div key={idx} className="text-xs text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <span>{arquivo.nome}</span>
                                {getRiskBadge(arquivo.riskLevel)}
                              </div>
                              <div className="text-xs text-gray-500 truncate max-w-xs">
                                {arquivo.context}
                              </div>
                            </div>
                          ))}
                          {titular.arquivos.length > 3 && (
                            <div className="text-xs text-gray-500">
                              ... e mais {titular.arquivos.length - 3} arquivo(s)
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatDate(titular.lastDetection)}
                    </span>
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
                Página {currentPage} de {totalPages} - {report.titulares.length} titulares
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

      {report.titulares.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhum titular encontrado
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ajuste os filtros para encontrar titulares específicos.
          </p>
        </div>
      )}
    </div>
  );
};
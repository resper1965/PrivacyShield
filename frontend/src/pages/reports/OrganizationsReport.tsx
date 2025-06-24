import React, { useState, useEffect } from 'react';
import { Building, Download, BarChart3 } from 'lucide-react';

interface OrganizationData {
  organization: string;
  identifier: string; // CNPJ or domain
  dataTypes: Record<string, number>; // CPF: 5, Email: 10, etc.
  totalDetections: number;
  highestRisk: string;
  lastActivity: string;
  files: string[];
}

export const OrganizationsReport: React.FC = () => {
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'detections' | 'risk' | 'activity'>('detections');
  const [filterRisk, setFilterRisk] = useState<string>('');

  useEffect(() => {
    fetchOrganizationsData();
  }, [sortBy, filterRisk]);

  const fetchOrganizationsData = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, this would aggregate data by organization
      const mockOrganizations: OrganizationData[] = [
        {
          organization: 'Empresa ABC Ltda',
          identifier: '12.345.678/0001-00',
          dataTypes: { CPF: 25, Email: 15, Telefone: 8, CNPJ: 3 },
          totalDetections: 51,
          highestRisk: 'high',
          lastActivity: '2025-06-24T01:00:00Z',
          files: ['customer_data.zip', 'employees.zip', 'backup.zip']
        },
        {
          organization: 'TechCorp Solutions',
          identifier: 'techcorp.com.br',
          dataTypes: { CPF: 42, Email: 38, Telefone: 12, RG: 6, CEP: 18 },
          totalDetections: 116,
          highestRisk: 'critical',
          lastActivity: '2025-06-23T15:30:00Z',
          files: ['database_export.zip', 'client_records.zip']
        },
        {
          organization: 'Consultoria XYZ',
          identifier: 'consultoria.xyz@empresa.com',
          dataTypes: { Email: 22, Telefone: 5, 'Nome Completo': 18 },
          totalDetections: 45,
          highestRisk: 'medium',
          lastActivity: '2025-06-22T10:15:00Z',
          files: ['contacts.zip']
        },
        {
          organization: 'StartupTech Inc',
          identifier: '98.765.432/0001-11',
          dataTypes: { CPF: 8, Email: 12, Telefone: 3 },
          totalDetections: 23,
          highestRisk: 'low',
          lastActivity: '2025-06-21T14:20:00Z',
          files: ['team_data.zip', 'investors.zip']
        },
        {
          organization: 'MegaCorp Brasil',
          identifier: 'megacorp.com.br',
          dataTypes: { CPF: 156, CNPJ: 45, Email: 89, Telefone: 67, RG: 34, CEP: 78, 'Nome Completo': 123 },
          totalDetections: 592,
          highestRisk: 'critical',
          lastActivity: '2025-06-24T00:45:00Z',
          files: ['hr_database.zip', 'customer_master.zip', 'financial_records.zip', 'audit_files.zip']
        }
      ];

      // Apply filters and sorting
      let filteredOrgs = mockOrganizations;
      
      if (filterRisk) {
        filteredOrgs = filteredOrgs.filter(org => org.highestRisk === filterRisk);
      }
      
      // Sort organizations
      filteredOrgs.sort((a, b) => {
        switch (sortBy) {
          case 'detections':
            return b.totalDetections - a.totalDetections;
          case 'risk':
            const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return riskOrder[b.highestRisk as keyof typeof riskOrder] - riskOrder[a.highestRisk as keyof typeof riskOrder];
          case 'activity':
            return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
          default:
            return 0;
        }
      });

      setOrganizations(filteredOrgs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching organizations data:', error);
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Organização', 'Identificador', 'Total Detecções', 'Maior Risco', 'Última Atividade', 'CPF', 'CNPJ', 'Email', 'Telefone', 'RG', 'CEP', 'Nome Completo', 'Arquivos'];
    
    const csvContent = [
      headers.join(','),
      ...organizations.map(org => [
        `"${org.organization}"`,
        `"${org.identifier}"`,
        org.totalDetections,
        org.highestRisk,
        new Date(org.lastActivity).toLocaleDateString('pt-BR'),
        org.dataTypes.CPF || 0,
        org.dataTypes.CNPJ || 0,
        org.dataTypes.Email || 0,
        org.dataTypes.Telefone || 0,
        org.dataTypes.RG || 0,
        org.dataTypes.CEP || 0,
        org.dataTypes['Nome Completo'] || 0,
        `"${org.files.join('; ')}"`,
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'relatorio_organizacoes.csv';
    link.click();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
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

  const getDataTypeColor = (type: string, index: number) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 
      'bg-pink-500', 'bg-indigo-500', 'bg-red-500'
    ];
    return colors[index % colors.length];
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
          Relatório por Organização
        </h1>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ordenar por:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="detections">Número de Detecções</option>
              <option value="risk">Nível de Risco</option>
              <option value="activity">Última Atividade</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filtrar por risco:
            </label>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="critical">Crítico</option>
              <option value="high">Alto</option>
              <option value="medium">Médio</option>
              <option value="low">Baixo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {organizations.map((org, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {org.organization}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {org.identifier}
                    </p>
                  </div>
                </div>
                {getRiskBadge(org.highestRisk)}
              </div>
            </div>

            {/* Stats */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {org.totalDetections}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Total de Detecções
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {org.files.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Arquivos
                  </div>
                </div>
              </div>

              {/* Data Types Matrix */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <BarChart3 size={16} />
                  Tipos de Dados Detectados
                </h4>
                <div className="space-y-1">
                  {Object.entries(org.dataTypes).map(([type, count], typeIndex) => {
                    const percentage = (count / org.totalDetections) * 100;
                    return (
                      <div key={type} className="flex items-center gap-2">
                        <div className="w-20 text-sm text-gray-600 dark:text-gray-400">
                          {type}
                        </div>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full ${getDataTypeColor(type, typeIndex)}`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="w-12 text-sm text-gray-900 dark:text-white text-right">
                          {count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Files */}
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Arquivos Processados
                </h4>
                <div className="space-y-1">
                  {org.files.slice(0, 3).map((file, fileIndex) => (
                    <div key={fileIndex} className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">
                      {file}
                    </div>
                  ))}
                  {org.files.length > 3 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ... e mais {org.files.length - 3} arquivo(s)
                    </div>
                  )}
                </div>
              </div>

              {/* Last Activity */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Última atividade: <span className="font-medium">{formatDate(org.lastActivity)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {organizations.length === 0 && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhuma organização encontrada
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ajuste os filtros ou aguarde o processamento de novos dados.
          </p>
        </div>
      )}
    </div>
  );
};
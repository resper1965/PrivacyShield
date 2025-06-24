import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, Plus, Search, Filter, Calendar, 
  Building, User, Eye, Edit, CheckCircle, Clock, Flag
} from 'lucide-react';

interface Incident {
  id: string;
  organization: { id: string; name: string };
  date: string;
  type: string;
  description: string;
  assignee?: { id: string; name: string; email: string };
  riskLevel?: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IncidentStats {
  totalIncidents: number;
  draftIncidents: number;
  publishedIncidents: number;
  recentIncidents: number;
  byType: Record<string, number>;
  byRiskLevel: Record<string, number>;
}

export const IncidentsList: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    riskLevel: '',
    assigneeId: '',
    isDraft: '',
    organizationId: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchIncidents();
    fetchStats();
  }, [currentPage, filters]);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await fetch(`/api/v1/incidents?${params}`);
      const data = await response.json();
      
      setIncidents(data.incidents);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/incidents/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null;
    
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
    };

    const labels = {
      low: 'Baixo',
      medium: 'Médio', 
      high: 'Alto',
      critical: 'Crítico'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[riskLevel as keyof typeof colors]}`}>
        {labels[riskLevel as keyof typeof labels]}
      </span>
    );
  };

  const getStatusIcon = (incident: Incident) => {
    if (incident.isDraft) {
      return <Clock className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusLabel = (incident: Incident) => {
    return incident.isDraft ? 'Rascunho' : 'Publicado';
  };

  if (loading && incidents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
          Incidentes Cibernéticos
        </h1>
        <Link
          to="/incidents/create"
          className="btn btn-primary"
        >
          <Plus size={16} />
          Novo Incidente
        </Link>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-metric">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                  Total de Incidentes
                </p>
                <p className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
                  {stats.totalIncidents}
                </p>
              </div>
              <AlertTriangle className="h-12 w-12" style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>

          <div className="card-metric">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                  Rascunhos
                </p>
                <p className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
                  {stats.draftIncidents}
                </p>
              </div>
              <Clock className="h-12 w-12 text-yellow-500" />
            </div>
          </div>

          <div className="card-metric">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                  Publicados
                </p>
                <p className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
                  {stats.publishedIncidents}
                </p>
              </div>
              <CheckCircle className="h-12 w-12" style={{ color: 'var(--color-success)' }} />
            </div>
          </div>

          <div className="card-metric">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                  Últimos 7 dias
                </p>
                <p className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
                  {stats.recentIncidents}
                </p>
              </div>
              <Calendar className="h-12 w-12" style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Buscar incidentes..."
                className="form-input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Tipo</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="form-select"
            >
              <option value="">Todos</option>
              <option value="Malware">Malware</option>
              <option value="Phishing">Phishing</option>
              <option value="DDoS">DDoS</option>
              <option value="Vazamento de Dados">Vazamento de Dados</option>
              <option value="Acesso Não Autorizado">Acesso Não Autorizado</option>
              <option value="Ransomware">Ransomware</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div>
            <label className="form-label">Nível de Risco</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters(prev => ({ ...prev, riskLevel: e.target.value }))}
              className="form-select"
            >
              <option value="">Todos</option>
              <option value="low">Baixo</option>
              <option value="medium">Médio</option>
              <option value="high">Alto</option>
              <option value="critical">Crítico</option>
            </select>
          </div>

          <div>
            <label className="form-label">Status</label>
            <select
              value={filters.isDraft}
              onChange={(e) => setFilters(prev => ({ ...prev, isDraft: e.target.value }))}
              className="form-select"
            >
              <option value="">Todos</option>
              <option value="false">Publicado</option>
              <option value="true">Rascunho</option>
            </select>
          </div>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tipo</th>
              <th>Organização</th>
              <th>Data</th>
              <th>Responsável</th>
              <th>Risco</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr key={incident.id}>
                <td>
                  <span className="text-small font-mono" style={{ color: 'var(--color-text-primary)' }}>
                    #{incident.id.slice(0, 8)}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <span style={{ color: 'var(--color-text-primary)' }}>{incident.type}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Building size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <span style={{ color: 'var(--color-text-primary)' }}>{incident.organization.name}</span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} style={{ color: 'var(--color-text-secondary)' }} />
                    <span style={{ color: 'var(--color-text-primary)' }}>{formatDate(incident.date)}</span>
                  </div>
                </td>
                <td>
                  {incident.assignee ? (
                    <div className="flex items-center gap-2">
                      <User size={16} style={{ color: 'var(--color-text-secondary)' }} />
                      <span style={{ color: 'var(--color-text-primary)' }}>{incident.assignee.name}</span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)' }}>Não atribuído</span>
                  )}
                </td>
                <td>
                  {getRiskBadge(incident.riskLevel)}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(incident)}
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      {getStatusLabel(incident)}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/incidents/${incident.id}`}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Ver detalhes"
                    >
                      <Eye size={16} />
                    </Link>
                    <Link
                      to={`/incidents/${incident.id}/edit`}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-small rounded disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--color-border)', 
                  color: 'var(--color-text-primary)' 
                }}
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-small rounded disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--color-border)', 
                  color: 'var(--color-text-primary)' 
                }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {incidents.length === 0 && !loading && (
        <div className="text-center py-12">
          <AlertTriangle className="mx-auto h-12 w-12" style={{ color: 'var(--color-text-secondary)' }} />
          <h3 className="mt-2 text-h3" style={{ color: 'var(--color-text-primary)' }}>
            Nenhum incidente encontrado
          </h3>
          <p className="mt-1 text-body" style={{ color: 'var(--color-text-secondary)' }}>
            {Object.values(filters).some(v => v) 
              ? 'Ajuste os filtros para ver mais incidentes.'
              : 'Cadastre o primeiro incidente cibernético.'
            }
          </p>
          {!Object.values(filters).some(v => v) && (
            <div className="mt-4">
              <Link to="/incidents/create" className="btn btn-primary">
                <Plus size={16} />
                Cadastrar Incidente
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
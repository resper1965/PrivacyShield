import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, User, Building, AlertTriangle, FileText, Edit, 
  Save, X, CheckCircle, Flag, Shield, Users, BookOpen 
} from 'lucide-react';

interface Incident {
  id: string;
  organization: { id: string; name: string };
  date: string;
  type: string;
  description: string;
  attachments: string[];
  assignee?: { id: string; name: string; email: string };
  semanticContext?: string;
  lgpdArticles: string[];
  dataCategories: string[];
  numSubjects?: number;
  riskLevel?: string;
  immediateMeasures?: string;
  actionPlan?: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LGPDAnalysis {
  semanticContext: string;
  lgpdArticles: string[];
  dataCategories: string[];
  numSubjects: number;
  riskLevel: string;
  immediateMeasures: string;
  actionPlan: string;
}

const LGPD_ARTICLES = [
  'Art. 6º - Princípios',
  'Art. 7º - Bases legais para tratamento',
  'Art. 8º - Consentimento',
  'Art. 9º - Dados sensíveis',
  'Art. 10º - Legítimo interesse',
  'Art. 46º - Segurança dos dados',
  'Art. 48º - Comunicação ao titular',
  'Art. 52º - Multas administrativas'
];

const DATA_CATEGORIES = [
  'CPF',
  'RG',
  'CNH',
  'Passaporte',
  'Email',
  'Telefone',
  'Endereço',
  'Dados Bancários',
  'Dados de Saúde',
  'Dados Biométricos',
  'Dados de Localização',
  'Histórico de Navegação'
];

const RISK_LEVELS = [
  { value: 'low', label: 'Baixo', color: 'var(--color-success)' },
  { value: 'medium', label: 'Médio', color: '#fbbf24' },
  { value: 'high', label: 'Alto', color: '#f97316' },
  { value: 'critical', label: 'Crítico', color: 'var(--color-error)' }
];

export const IncidentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<LGPDAnalysis>({
    semanticContext: '',
    lgpdArticles: [],
    dataCategories: [],
    numSubjects: 0,
    riskLevel: 'medium',
    immediateMeasures: '',
    actionPlan: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchIncident();
    }
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/incidents/${id}`);
      
      if (!response.ok) {
        throw new Error('Incidente não encontrado');
      }
      
      const data = await response.json();
      setIncident(data);
      
      // Initialize analysis data if already exists
      if (data.semanticContext || data.lgpdArticles.length > 0) {
        setAnalysisData({
          semanticContext: data.semanticContext || '',
          lgpdArticles: data.lgpdArticles || [],
          dataCategories: data.dataCategories || [],
          numSubjects: data.numSubjects || 0,
          riskLevel: data.riskLevel || 'medium',
          immediateMeasures: data.immediateMeasures || '',
          actionPlan: data.actionPlan || ''
        });
      }
    } catch (error) {
      console.error('Error fetching incident:', error);
      alert('Erro ao carregar incidente');
      navigate('/incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!incident) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/v1/incidents/${incident.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisData),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar análise');
      }

      const updatedIncident = await response.json();
      setIncident(updatedIncident);
      setShowAnalysisModal(false);
      alert('Análise LGPD salva com sucesso!');
    } catch (error) {
      console.error('Error saving analysis:', error);
      alert('Erro ao salvar análise');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkFalsePositive = async () => {
    if (!incident) return;
    
    if (window.confirm('Tem certeza que deseja marcar como falso positivo?')) {
      try {
        // In a real implementation, this would update the incident status
        alert('Marcado como falso positivo');
      } catch (error) {
        console.error('Error marking as false positive:', error);
        alert('Erro ao marcar como falso positivo');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getRiskColor = (riskLevel?: string) => {
    const risk = RISK_LEVELS.find(r => r.value === riskLevel);
    return risk?.color || 'var(--color-text-secondary)';
  };

  const getRiskLabel = (riskLevel?: string) => {
    const risk = RISK_LEVELS.find(r => r.value === riskLevel);
    return risk?.label || 'Não definido';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12" style={{ color: 'var(--color-error)' }} />
        <h3 className="mt-2 text-h3" style={{ color: 'var(--color-text-primary)' }}>
          Incidente não encontrado
        </h3>
      </div>
    );
  }

  const hasAnalysis = incident.semanticContext || incident.lgpdArticles.length > 0;

  return (
    <div className="space-y-6 fade-in">
      {/* Breadcrumb */}
      <nav className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
        Dashboard / Incidentes / Detalhe do Incidente
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
            Incidente #{incident.id.slice(0, 8)}
          </h1>
          <p className="text-body mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {incident.type} - {incident.organization.name}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {incident.isDraft && (
            <span className="badge badge-secondary">
              Rascunho
            </span>
          )}
          <button
            onClick={() => navigate(`/incidents/${incident.id}/edit`)}
            className="btn btn-secondary"
          >
            <Edit size={16} />
            Editar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Incident Details */}
          <div className="card">
            <h3 className="text-h3 mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Detalhes do Incidente
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">
                    <Building size={16} className="inline mr-2" />
                    Empresa
                  </label>
                  <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                    {incident.organization.name}
                  </p>
                </div>
                
                <div>
                  <label className="form-label">
                    <Calendar size={16} className="inline mr-2" />
                    Data do Incidente
                  </label>
                  <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                    {formatDate(incident.date)}
                  </p>
                </div>
              </div>

              <div>
                <label className="form-label">
                  <AlertTriangle size={16} className="inline mr-2" />
                  Tipo de Incidente
                </label>
                <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                  {incident.type}
                </p>
              </div>

              <div>
                <label className="form-label">Descrição</label>
                <div 
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--color-background)', 
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  {incident.description}
                </div>
              </div>

              {incident.attachments.length > 0 && (
                <div>
                  <label className="form-label">Anexos</label>
                  <div className="space-y-2">
                    {incident.attachments.map((attachment, index) => (
                      <div 
                        key={index}
                        className="flex items-center gap-2 p-2 rounded border"
                        style={{ 
                          backgroundColor: 'var(--color-background)', 
                          borderColor: 'var(--color-border)' 
                        }}
                      >
                        <FileText size={16} style={{ color: 'var(--color-text-secondary)' }} />
                        <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                          {attachment}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {incident.assignee && (
                <div>
                  <label className="form-label">
                    <User size={16} className="inline mr-2" />
                    Responsável
                  </label>
                  <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                    {incident.assignee.name} ({incident.assignee.email})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* LGPD Analysis */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
                Análise LGPD
              </h3>
              
              {!hasAnalysis ? (
                <button
                  onClick={() => setShowAnalysisModal(true)}
                  className="btn btn-primary"
                >
                  <Shield size={16} />
                  Iniciar Análise
                </button>
              ) : (
                <button
                  onClick={() => setShowAnalysisModal(true)}
                  className="btn btn-secondary"
                >
                  <Edit size={16} />
                  Editar Análise
                </button>
              )}
            </div>

            {hasAnalysis ? (
              <div className="space-y-4">
                {incident.riskLevel && (
                  <div>
                    <label className="form-label">Nível de Risco</label>
                    <span 
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                      style={{ 
                        backgroundColor: `${getRiskColor(incident.riskLevel)}20`,
                        color: getRiskColor(incident.riskLevel)
                      }}
                    >
                      {getRiskLabel(incident.riskLevel)}
                    </span>
                  </div>
                )}

                {incident.lgpdArticles.length > 0 && (
                  <div>
                    <label className="form-label">Artigos da LGPD Violados</label>
                    <div className="flex flex-wrap gap-2">
                      {incident.lgpdArticles.map((article, index) => (
                        <span key={index} className="badge badge-primary">
                          {article}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {incident.dataCategories.length > 0 && (
                  <div>
                    <label className="form-label">Categorias de Dados Afetados</label>
                    <div className="flex flex-wrap gap-2">
                      {incident.dataCategories.map((category, index) => (
                        <span key={index} className="badge badge-secondary">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {incident.numSubjects && (
                  <div>
                    <label className="form-label">
                      <Users size={16} className="inline mr-2" />
                      Número de Titulares Afetados
                    </label>
                    <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                      {incident.numSubjects.toLocaleString()}
                    </p>
                  </div>
                )}

                {incident.immediateMeasures && (
                  <div>
                    <label className="form-label">Medidas Imediatas</label>
                    <div 
                      className="p-4 rounded-lg border"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {incident.immediateMeasures}
                    </div>
                  </div>
                )}

                {incident.actionPlan && (
                  <div>
                    <label className="form-label">Plano de Ação</label>
                    <div 
                      className="p-4 rounded-lg border"
                      style={{ 
                        backgroundColor: 'var(--color-background)', 
                        borderColor: 'var(--color-border)',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      {incident.actionPlan}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--color-text-secondary)' }} />
                <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
                  Análise LGPD ainda não foi realizada para este incidente.
                </p>
                <p className="text-small mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Clique em "Iniciar Análise" para registrar informações de conformidade.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="card">
            <h3 className="text-h3 mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Ações
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleMarkFalsePositive}
                className="w-full btn btn-secondary"
              >
                <Flag size={16} />
                Marcar Falso Positivo
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="card">
            <h3 className="text-h3 mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Informações
            </h3>
            <div className="space-y-3 text-small">
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Criado em:</span>
                <p style={{ color: 'var(--color-text-primary)' }}>{formatDate(incident.createdAt)}</p>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Atualizado em:</span>
                <p style={{ color: 'var(--color-text-primary)' }}>{formatDate(incident.updatedAt)}</p>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                <p style={{ color: 'var(--color-text-primary)' }}>
                  {incident.isDraft ? 'Rascunho' : 'Publicado'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LGPD Analysis Modal */}
      {showAnalysisModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
                Análise LGPD
              </h3>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="p-1 rounded hover:bg-opacity-50"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-96 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="form-label">Contexto Semântico</label>
                  <textarea
                    value={analysisData.semanticContext}
                    onChange={(e) => setAnalysisData(prev => ({ ...prev, semanticContext: e.target.value }))}
                    placeholder="Descreva o contexto e impacto do incidente..."
                    rows={4}
                    className="form-input resize-none"
                  />
                </div>

                <div>
                  <label className="form-label">Nível de Risco</label>
                  <select
                    value={analysisData.riskLevel}
                    onChange={(e) => setAnalysisData(prev => ({ ...prev, riskLevel: e.target.value }))}
                    className="form-select"
                  >
                    {RISK_LEVELS.map((risk) => (
                      <option key={risk.value} value={risk.value}>
                        {risk.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Artigos da LGPD Violados</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {LGPD_ARTICLES.map((article) => (
                    <label key={article} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={analysisData.lgpdArticles.includes(article)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAnalysisData(prev => ({
                              ...prev,
                              lgpdArticles: [...prev.lgpdArticles, article]
                            }));
                          } else {
                            setAnalysisData(prev => ({
                              ...prev,
                              lgpdArticles: prev.lgpdArticles.filter(a => a !== article)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                        {article}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Categorias de Dados Afetados</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {DATA_CATEGORIES.map((category) => (
                    <label key={category} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={analysisData.dataCategories.includes(category)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAnalysisData(prev => ({
                              ...prev,
                              dataCategories: [...prev.dataCategories, category]
                            }));
                          } else {
                            setAnalysisData(prev => ({
                              ...prev,
                              dataCategories: prev.dataCategories.filter(c => c !== category)
                            }));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                        {category}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label">Número Estimado de Titulares Afetados</label>
                <input
                  type="number"
                  min="0"
                  value={analysisData.numSubjects}
                  onChange={(e) => setAnalysisData(prev => ({ ...prev, numSubjects: parseInt(e.target.value) || 0 }))}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Medidas Imediatas Tomadas</label>
                <textarea
                  value={analysisData.immediateMeasures}
                  onChange={(e) => setAnalysisData(prev => ({ ...prev, immediateMeasures: e.target.value }))}
                  placeholder="Descreva as medidas imediatas implementadas..."
                  rows={3}
                  className="form-input resize-none"
                />
              </div>

              <div>
                <label className="form-label">Plano de Ação</label>
                <textarea
                  value={analysisData.actionPlan}
                  onChange={(e) => setAnalysisData(prev => ({ ...prev, actionPlan: e.target.value }))}
                  placeholder="Descreva o plano de ação para remediar o incidente..."
                  rows={3}
                  className="form-input resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="btn btn-secondary"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAnalysis}
                className="btn btn-primary"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar Análise'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { Save, TestTube, Eye, EyeOff, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface EnvironmentVariable {
  key: string;
  value: string;
  masked: boolean;
  description?: string;
  category: 'system' | 'integrations' | 'security' | 'custom';
}

const PREDEFINED_VARS = [
  { key: 'OPENAI_API_KEY', category: 'integrations', description: 'Chave da API OpenAI para análise de PII' },
  { key: 'MAX_UPLOAD_MB', category: 'system', description: 'Tamanho máximo de upload em MB' },
  { key: 'CLAMAV_HOST', category: 'security', description: 'Host do servidor ClamAV' },
  { key: 'CLAMAV_PORT', category: 'security', description: 'Porta do servidor ClamAV' },
  { key: 'REDIS_URL', category: 'system', description: 'URL de conexão do Redis' },
  { key: 'SMTP_HOST', category: 'integrations', description: 'Servidor SMTP para envio de emails' },
  { key: 'SMTP_PORT', category: 'integrations', description: 'Porta do servidor SMTP' },
  { key: 'WEBHOOK_SECRET', category: 'security', description: 'Chave secreta para webhooks' },
  { key: 'JWT_SECRET', category: 'security', description: 'Chave secreta para tokens JWT' }
];

export const Environment: React.FC = () => {
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState({ openai: false, clamav: false });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVar, setNewVar] = useState({ key: '', value: '', description: '', category: 'custom' as const });
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchEnvironmentVariables();
  }, []);

  const fetchEnvironmentVariables = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from /api/v1/environment
      const mockVariables: EnvironmentVariable[] = [
        { key: 'OPENAI_API_KEY', value: 'sk-...abcd', masked: true, category: 'integrations', description: 'Chave da API OpenAI para análise de PII' },
        { key: 'MAX_UPLOAD_MB', value: '100', masked: false, category: 'system', description: 'Tamanho máximo de upload em MB' },
        { key: 'CLAMAV_HOST', value: 'localhost', masked: false, category: 'security', description: 'Host do servidor ClamAV' },
        { key: 'CLAMAV_PORT', value: '3310', masked: false, category: 'security', description: 'Porta do servidor ClamAV' },
        { key: 'REDIS_URL', value: 'redis://localhost:6379', masked: false, category: 'system', description: 'URL de conexão do Redis' },
        { key: 'SMTP_HOST', value: 'smtp.gmail.com', masked: false, category: 'integrations', description: 'Servidor SMTP' },
        { key: 'JWT_SECRET', value: '***hidden***', masked: true, category: 'security', description: 'Chave secreta para tokens JWT' }
      ];

      setVariables(mockVariables);
    } catch (error) {
      console.error('Error fetching environment variables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // In real implementation, save to API
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Variáveis de ambiente salvas com sucesso!');
    } catch (error) {
      console.error('Error saving environment variables:', error);
      alert('Erro ao salvar variáveis de ambiente');
    } finally {
      setSaving(false);
    }
  };

  const handleTestOpenAI = async () => {
    try {
      setTesting(prev => ({ ...prev, openai: true }));
      // In real implementation, test OpenAI connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Conexão OpenAI testada com sucesso!');
    } catch (error) {
      console.error('Error testing OpenAI:', error);
      alert('Erro ao testar conexão OpenAI');
    } finally {
      setTesting(prev => ({ ...prev, openai: false }));
    }
  };

  const handleTestClamAV = async () => {
    try {
      setTesting(prev => ({ ...prev, clamav: true }));
      // In real implementation, test ClamAV connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Conexão ClamAV testada com sucesso!');
    } catch (error) {
      console.error('Error testing ClamAV:', error);
      alert('Erro ao testar conexão ClamAV');
    } finally {
      setTesting(prev => ({ ...prev, clamav: false }));
    }
  };

  const handleAddVariable = () => {
    if (!newVar.key || !newVar.value) {
      alert('Chave e valor são obrigatórios');
      return;
    }

    const variable: EnvironmentVariable = {
      key: newVar.key,
      value: newVar.value,
      masked: newVar.category === 'security',
      category: newVar.category,
      description: newVar.description
    };

    setVariables([...variables, variable]);
    setShowAddModal(false);
    setNewVar({ key: '', value: '', description: '', category: 'custom' });
  };

  const handleUpdateVariable = (key: string, field: keyof EnvironmentVariable, value: any) => {
    setVariables(variables.map(v => 
      v.key === key ? { ...v, [field]: value } : v
    ));
  };

  const handleDeleteVariable = (key: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a variável ${key}?`)) {
      setVariables(variables.filter(v => v.key !== key));
    }
  };

  const toggleMasked = (key: string) => {
    setVariables(variables.map(v => 
      v.key === key ? { ...v, masked: !v.masked } : v
    ));
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      system: 'Sistema',
      integrations: 'Integrações',
      security: 'Segurança',
      custom: 'Personalizada'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      system: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      integrations: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
      security: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
      custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.custom;
  };

  const filteredVariables = filter === 'all' 
    ? variables 
    : variables.filter(v => v.category === filter);

  if (loading) {
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
          Variáveis de Ambiente
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleTestOpenAI}
            disabled={testing.openai}
            className="btn btn-secondary"
          >
            <TestTube size={16} />
            {testing.openai ? 'Testando...' : 'Testar OpenAI'}
          </button>
          <button
            onClick={handleTestClamAV}
            disabled={testing.clamav}
            className="btn btn-secondary"
          >
            <TestTube size={16} />
            {testing.clamav ? 'Testando...' : 'Testar ClamAV'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary"
          >
            <Plus size={16} />
            Nova Variável
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="card" style={{ backgroundColor: 'rgba(224, 63, 63, 0.1)', borderColor: 'var(--color-error)' }}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" style={{ color: 'var(--color-error)' }} />
          <div>
            <h3 className="font-medium" style={{ color: 'var(--color-error)' }}>
              Atenção
            </h3>
            <p className="text-small" style={{ color: 'var(--color-error)' }}>
              Alterações nas variáveis de ambiente podem afetar o funcionamento do sistema. 
              Teste as conexões antes de salvar.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <label className="form-label">Filtrar por categoria:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-select"
          >
            <option value="all">Todas</option>
            <option value="system">Sistema</option>
            <option value="integrations">Integrações</option>
            <option value="security">Segurança</option>
            <option value="custom">Personalizada</option>
          </select>
        </div>
      </div>

      {/* Variables Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Chave</th>
              <th>Valor</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredVariables.map((variable) => (
              <tr key={variable.key}>
                <td>
                  <code 
                    className="font-mono text-small px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: 'var(--color-background)', 
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {variable.key}
                  </code>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <input
                      type={variable.masked ? 'password' : 'text'}
                      value={variable.value}
                      onChange={(e) => handleUpdateVariable(variable.key, 'value', e.target.value)}
                      className="form-input text-small"
                      style={{ minWidth: '200px' }}
                    />
                    <button
                      onClick={() => toggleMasked(variable.key)}
                      className="text-gray-500 hover:text-gray-700"
                      title={variable.masked ? 'Mostrar' : 'Ocultar'}
                    >
                      {variable.masked ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </td>
                <td>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(variable.category)}`}>
                    {getCategoryLabel(variable.category)}
                  </span>
                </td>
                <td>
                  <input
                    type="text"
                    value={variable.description || ''}
                    onChange={(e) => handleUpdateVariable(variable.key, 'description', e.target.value)}
                    placeholder="Descrição da variável..."
                    className="form-input text-small"
                  />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {variable.category === 'custom' && (
                      <button
                        onClick={() => handleDeleteVariable(variable.key)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>

      {/* Add Variable Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
                Nova Variável de Ambiente
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded hover:bg-opacity-50"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="form-label">Chave *</label>
                <input
                  type="text"
                  value={newVar.key}
                  onChange={(e) => setNewVar(prev => ({ ...prev, key: e.target.value.toUpperCase() }))}
                  className="form-input font-mono"
                  placeholder="MINHA_VARIAVEL"
                />
              </div>

              <div>
                <label className="form-label">Valor *</label>
                <input
                  type="text"
                  value={newVar.value}
                  onChange={(e) => setNewVar(prev => ({ ...prev, value: e.target.value }))}
                  className="form-input"
                  placeholder="valor da variável"
                />
              </div>

              <div>
                <label className="form-label">Categoria</label>
                <select
                  value={newVar.category}
                  onChange={(e) => setNewVar(prev => ({ ...prev, category: e.target.value as any }))}
                  className="form-select"
                >
                  <option value="custom">Personalizada</option>
                  <option value="system">Sistema</option>
                  <option value="integrations">Integrações</option>
                  <option value="security">Segurança</option>
                </select>
              </div>

              <div>
                <label className="form-label">Descrição</label>
                <textarea
                  value={newVar.description}
                  onChange={(e) => setNewVar(prev => ({ ...prev, description: e.target.value }))}
                  className="form-input resize-none"
                  rows={2}
                  placeholder="Descrição da variável..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddVariable}
                className="btn btn-primary"
                disabled={!newVar.key || !newVar.value}
              >
                Adicionar Variável
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredVariables.length === 0 && (
        <div className="text-center py-12">
          <Plus className="mx-auto h-12 w-12" style={{ color: 'var(--color-text-secondary)' }} />
          <h3 className="mt-2 text-h3" style={{ color: 'var(--color-text-primary)' }}>
            Nenhuma variável encontrada
          </h3>
          <p className="mt-1 text-body" style={{ color: 'var(--color-text-secondary)' }}>
            {filter === 'all' 
              ? 'Adicione variáveis de ambiente para configurar o sistema.'
              : `Nenhuma variável na categoria "${getCategoryLabel(filter)}".`
            }
          </p>
        </div>
      )}
    </div>
  );
};
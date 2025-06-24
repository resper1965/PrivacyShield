import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Toggle, TestTube, CheckCircle, XCircle } from 'lucide-react';

interface Pattern {
  id: number;
  name: string;
  pattern: string;
  type: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  pattern: string;
  type: string;
  description: string;
  isActive: boolean;
}

const PATTERN_TYPES = [
  'CPF',
  'CNPJ', 
  'RG',
  'CEP',
  'Email',
  'Telefone',
  'Nome Completo',
  'Outros'
];

export const RegexPatterns: React.FC = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
  const [testInput, setTestInput] = useState('');
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<FormData>({
    name: '',
    pattern: '',
    type: 'Outros',
    description: '',
    isActive: true
  });

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from /api/v1/patterns
      const mockPatterns: Pattern[] = [
        {
          id: 1,
          name: 'CPF',
          pattern: '\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}',
          type: 'CPF',
          description: 'Padrão para identificação de CPF brasileiro',
          isActive: true,
          isDefault: true,
          createdAt: '2025-06-24T00:00:00Z',
          updatedAt: '2025-06-24T00:00:00Z'
        },
        {
          id: 2,
          name: 'CNPJ',
          pattern: '\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}',
          type: 'CNPJ',
          description: 'Padrão para identificação de CNPJ brasileiro',
          isActive: true,
          isDefault: true,
          createdAt: '2025-06-24T00:00:00Z',
          updatedAt: '2025-06-24T00:00:00Z'
        },
        {
          id: 3,
          name: 'Email',
          pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
          type: 'Email',
          description: 'Padrão para identificação de endereços de email',
          isActive: true,
          isDefault: true,
          createdAt: '2025-06-24T00:00:00Z',
          updatedAt: '2025-06-24T00:00:00Z'
        },
        {
          id: 4,
          name: 'Telefone BR',
          pattern: '\\(?\\d{2}\\)?\\s?9?\\d{4}-?\\d{4}',
          type: 'Telefone',
          description: 'Padrão para telefones brasileiros',
          isActive: true,
          isDefault: true,
          createdAt: '2025-06-24T00:00:00Z',
          updatedAt: '2025-06-24T00:00:00Z'
        },
        {
          id: 5,
          name: 'CEP',
          pattern: '\\d{5}-?\\d{3}',
          type: 'CEP',
          description: 'Padrão para CEP brasileiro',
          isActive: false,
          isDefault: false,
          createdAt: '2025-06-24T00:00:00Z',
          updatedAt: '2025-06-24T00:00:00Z'
        }
      ];

      setPatterns(mockPatterns);
    } catch (error) {
      console.error('Error fetching patterns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePattern = async () => {
    try {
      // Validate regex pattern
      try {
        new RegExp(formData.pattern);
      } catch {
        alert('Padrão regex inválido');
        return;
      }

      if (editingPattern) {
        // Update existing pattern
        setPatterns(patterns.map(p => 
          p.id === editingPattern.id 
            ? { ...p, ...formData, updatedAt: new Date().toISOString() }
            : p
        ));
      } else {
        // Create new pattern
        const newPattern: Pattern = {
          id: Date.now(),
          ...formData,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setPatterns([...patterns, newPattern]);
      }

      setShowModal(false);
      setEditingPattern(null);
      resetForm();
    } catch (error) {
      console.error('Error saving pattern:', error);
      alert('Erro ao salvar padrão');
    }
  };

  const handleEditPattern = (pattern: Pattern) => {
    setEditingPattern(pattern);
    setFormData({
      name: pattern.name,
      pattern: pattern.pattern,
      type: pattern.type,
      description: pattern.description || '',
      isActive: pattern.isActive
    });
    setShowModal(true);
  };

  const handleDeletePattern = async (id: number) => {
    const pattern = patterns.find(p => p.id === id);
    
    if (pattern?.isDefault) {
      alert('Não é possível excluir padrões padrão do sistema');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir este padrão?')) {
      setPatterns(patterns.filter(p => p.id !== id));
    }
  };

  const handleToggleActive = async (id: number) => {
    setPatterns(patterns.map(p => 
      p.id === id ? { ...p, isActive: !p.isActive } : p
    ));
  };

  const handleTestPattern = (pattern: string) => {
    if (!testInput.trim()) return;

    try {
      const regex = new RegExp(pattern, 'g');
      const matches = testInput.match(regex);
      setTestResults(prev => ({
        ...prev,
        [pattern]: !!matches
      }));
    } catch {
      setTestResults(prev => ({
        ...prev,
        [pattern]: false
      }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      pattern: '',
      type: 'Outros',
      description: '',
      isActive: true
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

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
          Padrões Regex (PII)
        </h1>
        <button
          onClick={() => {
            setEditingPattern(null);
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} />
          Novo Padrão
        </button>
      </div>

      {/* Test Section */}
      <div className="card">
        <h3 className="text-h3 mb-4" style={{ color: 'var(--color-text-primary)' }}>
          Teste de Padrões
        </h3>
        <div className="space-y-4">
          <div>
            <label className="form-label">Texto de Teste</label>
            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Digite um texto para testar os padrões regex..."
              rows={3}
              className="form-input resize-none"
            />
          </div>
          <button
            onClick={() => {
              patterns.forEach(pattern => {
                if (pattern.isActive) {
                  handleTestPattern(pattern.pattern);
                }
              });
            }}
            className="btn btn-secondary"
            disabled={!testInput.trim()}
          >
            <TestTube size={16} />
            Testar Todos os Padrões Ativos
          </button>
        </div>
      </div>

      {/* Patterns Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Padrão</th>
              <th>Status</th>
              <th>Teste</th>
              <th>Criado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((pattern) => (
              <tr key={pattern.id}>
                <td>
                  <div>
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {pattern.name}
                    </span>
                    {pattern.isDefault && (
                      <span className="ml-2 text-xs px-2 py-1 rounded" style={{ 
                        backgroundColor: 'rgba(0, 173, 224, 0.2)', 
                        color: 'var(--color-primary)' 
                      }}>
                        Padrão
                      </span>
                    )}
                  </div>
                  {pattern.description && (
                    <div className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                      {pattern.description}
                    </div>
                  )}
                </td>
                <td>
                  <span className="badge badge-secondary">
                    {pattern.type}
                  </span>
                </td>
                <td>
                  <code 
                    className="text-small font-mono px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: 'var(--color-background)', 
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {pattern.pattern}
                  </code>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(pattern.id)}
                      className={`p-1 rounded ${pattern.isActive ? 'text-green-500' : 'text-gray-400'}`}
                      title={pattern.isActive ? 'Desativar' : 'Ativar'}
                    >
                      <Toggle size={16} />
                    </button>
                    <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                      {pattern.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestPattern(pattern.pattern)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Testar padrão"
                      disabled={!testInput.trim()}
                    >
                      <TestTube size={16} />
                    </button>
                    {testResults[pattern.pattern] !== undefined && (
                      testResults[pattern.pattern] ? (
                        <CheckCircle size={16} className="text-green-500" />
                      ) : (
                        <XCircle size={16} className="text-red-500" />
                      )
                    )}
                  </div>
                </td>
                <td>
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    {formatDate(pattern.createdAt)}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditPattern(pattern)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    {!pattern.isDefault && (
                      <button
                        onClick={() => handleDeletePattern(pattern.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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

      {/* Pattern Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
                {editingPattern ? 'Editar Padrão' : 'Novo Padrão'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-opacity-50"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="Nome do padrão"
                  />
                </div>
                <div>
                  <label className="form-label">Tipo *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="form-select"
                  >
                    {PATTERN_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Padrão Regex *</label>
                <input
                  type="text"
                  value={formData.pattern}
                  onChange={(e) => setFormData(prev => ({ ...prev, pattern: e.target.value }))}
                  className="form-input font-mono"
                  placeholder="\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}"
                />
              </div>

              <div>
                <label className="form-label">Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="form-input resize-none"
                  rows={3}
                  placeholder="Descrição do padrão..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    Padrão ativo
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setShowModal(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePattern}
                className="btn btn-primary"
                disabled={!formData.name || !formData.pattern}
              >
                {editingPattern ? 'Atualizar' : 'Criar'} Padrão
              </button>
            </div>
          </div>
        </div>
      )}

      {patterns.length === 0 && (
        <div className="text-center py-12">
          <TestTube className="mx-auto h-12 w-12" style={{ color: 'var(--color-text-secondary)' }} />
          <h3 className="mt-2 text-h3" style={{ color: 'var(--color-text-primary)' }}>
            Nenhum padrão configurado
          </h3>
          <p className="mt-1 text-body" style={{ color: 'var(--color-text-secondary)' }}>
            Crie padrões regex para detectar tipos específicos de PII.
          </p>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';

interface RegexPattern {
  id: string;
  name: string;
  pattern: string;
  description: string;
  category: 'documento' | 'pessoal' | 'contato' | 'financeiro' | 'custom';
  enabled: boolean;
  examples: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const TelaRegexPatterns: React.FC = () => {
  const [patterns, setPatterns] = useState<RegexPattern[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPattern, setEditingPattern] = useState<RegexPattern | null>(null);
  const [testPattern, setTestPattern] = useState('');
  const [testText, setTestText] = useState('');
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    pattern: '',
    description: '',
    category: 'custom' as const,
    enabled: true,
    examples: ['']
  });

  // Load patterns on component mount
  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/regex-patterns');
      if (response.ok) {
        const data = await response.json();
        setPatterns(data);
      }
    } catch (error) {
      console.error('Error loading patterns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingPattern ? 'PUT' : 'POST';
      const url = editingPattern 
        ? `/api/v1/regex-patterns/${editingPattern.id}`
        : '/api/v1/regex-patterns';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          examples: formData.examples.filter(ex => ex.trim())
        })
      });

      if (response.ok) {
        await loadPatterns();
        resetForm();
      }
    } catch (error) {
      console.error('Error saving pattern:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este padrão?')) return;
    
    try {
      const response = await fetch(`/api/v1/regex-patterns/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await loadPatterns();
      }
    } catch (error) {
      console.error('Error deleting pattern:', error);
    }
  };

  const handleEdit = (pattern: RegexPattern) => {
    setEditingPattern(pattern);
    setFormData({
      name: pattern.name,
      pattern: pattern.pattern,
      description: pattern.description,
      category: pattern.category,
      enabled: pattern.enabled,
      examples: pattern.examples.length > 0 ? pattern.examples : ['']
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      pattern: '',
      description: '',
      category: 'custom',
      enabled: true,
      examples: ['']
    });
    setEditingPattern(null);
    setShowForm(false);
  };

  const handleTestPattern = async () => {
    if (!testPattern || !testText) return;
    
    try {
      const response = await fetch('/api/v1/regex-patterns/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pattern: testPattern, text: testText })
      });
      
      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      }
    } catch (error) {
      console.error('Error testing pattern:', error);
    }
  };

  const addExample = () => {
    setFormData({
      ...formData,
      examples: [...formData.examples, '']
    });
  };

  const updateExample = (index: number, value: string) => {
    const newExamples = [...formData.examples];
    newExamples[index] = value;
    setFormData({ ...formData, examples: newExamples });
  };

  const removeExample = (index: number) => {
    setFormData({
      ...formData,
      examples: formData.examples.filter((_, i) => i !== index)
    });
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      documento: '#ef4444',
      pessoal: '#f59e0b',
      contato: '#10b981',
      financeiro: '#8b5cf6',
      custom: '#00ade0'
    };
    return colors[category] || '#6b7280';
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      documento: 'Documento',
      pessoal: 'Pessoal',
      contato: 'Contato',
      financeiro: 'Financeiro',
      custom: 'Personalizado'
    };
    return labels[category] || category;
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h1 style={{
          color: '#E0E1E6',
          fontSize: '24px',
          fontWeight: 'bold',
          margin: 0
        }}>
          Padrões Regex
        </h1>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '12px 20px',
            backgroundColor: '#00ade0',
            border: 'none',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          + Novo Padrão
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#112240',
            borderRadius: '8px',
            padding: '24px',
            width: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid #1B263B'
          }}>
            <h3 style={{
              color: '#E0E1E6',
              fontSize: '18px',
              fontWeight: '600',
              margin: '0 0 20px 0'
            }}>
              {editingPattern ? 'Editar Padrão' : 'Novo Padrão Regex'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#E0E1E6',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px'
                }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0D1B2A',
                    border: '1px solid #1B263B',
                    borderRadius: '8px',
                    color: '#E0E1E6',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#E0E1E6',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px'
                }}>
                  Padrão Regex
                </label>
                <input
                  type="text"
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  required
                  placeholder="Ex: \\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b"
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0D1B2A',
                    border: '1px solid #1B263B',
                    borderRadius: '8px',
                    color: '#E0E1E6',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#E0E1E6',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px'
                }}>
                  Descrição
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0D1B2A',
                    border: '1px solid #1B263B',
                    borderRadius: '8px',
                    color: '#E0E1E6',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#E0E1E6',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px'
                }}>
                  Categoria
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#0D1B2A',
                    border: '1px solid #1B263B',
                    borderRadius: '8px',
                    color: '#E0E1E6',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  <option value="custom">Personalizado</option>
                  <option value="documento">Documento</option>
                  <option value="pessoal">Pessoal</option>
                  <option value="contato">Contato</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  color: '#E0E1E6',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '6px'
                }}>
                  Exemplos
                </label>
                {formData.examples.map((example, index) => (
                  <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={example}
                      onChange={(e) => updateExample(index, e.target.value)}
                      placeholder="Exemplo de texto que corresponde ao padrão"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: '#0D1B2A',
                        border: '1px solid #1B263B',
                        borderRadius: '6px',
                        color: '#E0E1E6',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                    {formData.examples.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExample(index)}
                        style={{
                          padding: '8px',
                          backgroundColor: '#ef4444',
                          border: 'none',
                          borderRadius: '6px',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addExample}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #1B263B',
                    borderRadius: '6px',
                    color: '#00ade0',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  + Adicionar Exemplo
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px'
              }}>
                <input
                  type="checkbox"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  style={{ marginRight: '8px' }}
                />
                <label style={{ color: '#E0E1E6', fontSize: '14px' }}>
                  Padrão ativo
                </label>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'transparent',
                    border: '1px solid #1B263B',
                    borderRadius: '6px',
                    color: '#E0E1E6',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#00ade0',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {editingPattern ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Section */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          color: '#E0E1E6',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 16px 0'
        }}>
          Testar Padrão Regex
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px'
            }}>
              Padrão
            </label>
            <input
              type="text"
              value={testPattern}
              onChange={(e) => setTestPattern(e.target.value)}
              placeholder="Insira o padrão regex para testar"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0D1B2A',
                border: '1px solid #1B263B',
                borderRadius: '6px',
                color: '#E0E1E6',
                fontSize: '14px',
                fontFamily: 'monospace',
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '6px'
            }}>
              Texto de Teste
            </label>
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Texto para testar o padrão"
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#0D1B2A',
                border: '1px solid #1B263B',
                borderRadius: '6px',
                color: '#E0E1E6',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>

        <button
          onClick={handleTestPattern}
          disabled={!testPattern || !testText}
          style={{
            padding: '10px 16px',
            backgroundColor: testPattern && testText ? '#00ade0' : '#1B263B',
            border: 'none',
            borderRadius: '6px',
            color: '#FFFFFF',
            fontSize: '14px',
            cursor: testPattern && testText ? 'pointer' : 'not-allowed',
            marginBottom: '16px'
          }}
        >
          Testar Padrão
        </button>

        {testResults && (
          <div style={{
            padding: '16px',
            backgroundColor: '#0D1B2A',
            borderRadius: '6px',
            border: '1px solid #1B263B'
          }}>
            <div style={{
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              Resultados: {testResults.count} correspondência(s) encontrada(s)
            </div>
            {testResults.matches.map((match: any, index: number) => (
              <div key={index} style={{
                padding: '8px',
                backgroundColor: '#1B263B',
                borderRadius: '4px',
                marginBottom: '8px',
                color: '#00ade0',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                "{match.match}" (posição {match.index})
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patterns List */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #1B263B'
        }}>
          <h3 style={{
            color: '#E0E1E6',
            fontSize: '16px',
            fontWeight: '600',
            margin: 0
          }}>
            Padrões Configurados ({patterns.length})
          </h3>
        </div>

        {isLoading ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#A5A8B1'
          }}>
            Carregando padrões...
          </div>
        ) : patterns.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#A5A8B1'
          }}>
            Nenhum padrão configurado
          </div>
        ) : (
          <div>
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                style={{
                  padding: '20px',
                  borderBottom: '1px solid #1B263B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                  }}>
                    <h4 style={{
                      color: '#E0E1E6',
                      fontSize: '16px',
                      fontWeight: '600',
                      margin: 0
                    }}>
                      {pattern.name}
                    </h4>
                    <span style={{
                      padding: '4px 8px',
                      backgroundColor: getCategoryColor(pattern.category),
                      color: 'white',
                      fontSize: '12px',
                      borderRadius: '4px',
                      fontWeight: '500'
                    }}>
                      {getCategoryLabel(pattern.category)}
                    </span>
                    {!pattern.enabled && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        fontSize: '12px',
                        borderRadius: '4px'
                      }}>
                        Inativo
                      </span>
                    )}
                  </div>
                  <p style={{
                    color: '#A5A8B1',
                    fontSize: '14px',
                    margin: '0 0 8px 0'
                  }}>
                    {pattern.description}
                  </p>
                  <code style={{
                    padding: '4px 8px',
                    backgroundColor: '#0D1B2A',
                    color: '#00ade0',
                    fontSize: '13px',
                    borderRadius: '4px',
                    fontFamily: 'monospace'
                  }}>
                    {pattern.pattern}
                  </code>
                  {pattern.examples.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <span style={{
                        color: '#A5A8B1',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Exemplos: {pattern.examples.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setTestPattern(pattern.pattern);
                    }}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      border: '1px solid #1B263B',
                      borderRadius: '6px',
                      color: '#00ade0',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Testar
                  </button>
                  <button
                    onClick={() => handleEdit(pattern)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: 'transparent',
                      border: '1px solid #1B263B',
                      borderRadius: '6px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Editar
                  </button>
                  {pattern.category === 'custom' && (
                    <button
                      onClick={() => handleDelete(pattern.id)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: 'transparent',
                        border: '1px solid #ef4444',
                        borderRadius: '6px',
                        color: '#ef4444',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TelaRegexPatterns;
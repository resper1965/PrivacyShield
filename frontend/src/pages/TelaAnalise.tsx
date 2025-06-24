import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Detection {
  id: string;
  type: string;
  value: string;
  context: string;
  isFalsePositive: boolean;
  titular?: string;
  arquivo?: string;
  timestamp?: string;
}

const fetchDetections = async (): Promise<Detection[]> => {
  const response = await fetch('/api/v1/detections');
  if (!response.ok) throw new Error('Erro ao carregar detecções');
  return response.json();
};

const toggleFalsePositive = async (id: string): Promise<void> => {
  const response = await fetch(`/api/v1/detections/${id}/flag`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isFalsePositive: true }),
  });
  if (!response.ok) throw new Error('Erro ao atualizar flag');
};

export const TelaAnalise: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery<Detection[]>({
    queryKey: ['detecoes'],
    queryFn: fetchDetections
  });

  const flagMutation = useMutation({
    mutationFn: toggleFalsePositive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detecoes'] });
    },
  });

  if (isLoading) {
    return (
      <div style={{ 
        padding: '24px', 
        color: '#E0E1E6', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #1B263B',
            borderTop: '4px solid #00ade0',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ margin: 0 }}>Carregando análises...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#112240',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        margin: '24px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#ef4444', margin: 0 }}>
          Erro ao carregar dados de análise
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Tabela de Detecções */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '120px 200px 120px 300px 120px',
          gap: '16px',
          padding: '16px 24px',
          backgroundColor: '#0D1B2A',
          borderBottom: '1px solid #1B263B'
        }}>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Tipo
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Valor
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Titular
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Contexto
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
            Falso Positivo?
          </span>
        </div>

        {/* Conteúdo */}
        {data && data.length > 0 ? (
          <div style={{ padding: '0 24px' }}>
            {data.map((det, index) => (
              <div
                key={det.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 200px 120px 300px 120px',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: index < data.length - 1 ? '1px solid #1B263B' : 'none',
                  alignItems: 'center'
                }}
              >
                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#0D1B2A',
                  borderRadius: '4px',
                  color: '#00ade0',
                  fontSize: '12px',
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  {det.type}
                </span>

                <span style={{
                  color: '#E0E1E6',
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {det.value}
                </span>

                <span style={{
                  color: '#A5A8B1',
                  fontSize: '14px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {det.titular || 'N/A'}
                </span>

                <span style={{
                  color: '#A5A8B1',
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '300px'
                }}>
                  {det.context || 'Contexto não disponível'}
                </span>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={det.isFalsePositive}
                      onChange={() => flagMutation.mutate(det.id)}
                      disabled={flagMutation.isPending}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#00ade0',
                        cursor: 'pointer'
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ color: '#A5A8B1', margin: 0 }}>
              Nenhuma detecção encontrada
            </p>
          </div>
        )}
      </div>

      {/* Status de loading para toggles */}
      {flagMutation.isPending && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#112240',
          border: '1px solid #00ade0',
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#00ade0',
          fontSize: '14px'
        }}>
          Atualizando...
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TelaAnalise;
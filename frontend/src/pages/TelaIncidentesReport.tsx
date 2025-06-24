import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface IncidenteReport {
  id: string;
  data: string;
  tipo: string;
  titular: string;
  isFalsoPositivo: boolean;
  arquivo: string;
  valor: string;
}

interface IncidentesData {
  incidentes: IncidenteReport[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

const fetchIncidentes = async (page: number = 1): Promise<IncidentesData> => {
  const response = await fetch(`/api/v1/reports/lgpd/incidentes?page=${page}`);
  if (!response.ok) throw new Error('Erro ao carregar incidentes');
  return response.json();
};

const toggleFalsoPositivo = async (id: string, isFalsoPositivo: boolean): Promise<void> => {
  const response = await fetch(`/api/v1/detections/${id}/flag`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isFalsoPositivo }),
  });
  if (!response.ok) throw new Error('Erro ao atualizar flag');
};

export const TelaIncidentesReport: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['incidentes-report', currentPage],
    queryFn: () => fetchIncidentes(currentPage)
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isFalsoPositivo }: { id: string; isFalsoPositivo: boolean }) =>
      toggleFalsoPositivo(id, isFalsoPositivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentes-report'] });
    },
  });

  const handleToggleFP = (id: string, currentValue: boolean) => {
    toggleMutation.mutate({ id, isFalsoPositivo: !currentValue });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (error) {
    return (
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #ef4444',
        borderRadius: '8px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <p style={{ color: '#ef4444', margin: 0 }}>
          Erro ao carregar relatório de incidentes
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Tabela de Incidentes */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '100px 150px 120px 200px 150px 120px',
          gap: '16px',
          padding: '16px 24px',
          backgroundColor: '#0D1B2A',
          borderBottom: '1px solid #1B263B'
        }}>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            ID
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Data
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Tipo
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Titular
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Arquivo
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
            Falso Positivo?
          </span>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div style={{ padding: '24px' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '100px 150px 120px 200px 150px 120px',
                gap: '16px',
                padding: '16px 0',
                borderBottom: i < 5 ? '1px solid #1B263B' : 'none'
              }}>
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <div key={j} style={{
                    height: '20px',
                    backgroundColor: '#1B263B',
                    borderRadius: '4px'
                  }} />
                ))}
              </div>
            ))}
          </div>
        ) : data?.incidentes?.length ? (
          <div style={{ padding: '0 24px' }}>
            {data.incidentes.map((incidente, index) => (
              <div
                key={incidente.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '100px 150px 120px 200px 150px 120px',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: index < data.incidentes.length - 1 ? '1px solid #1B263B' : 'none',
                  alignItems: 'center'
                }}
              >
                <span style={{
                  color: '#A5A8B1',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  {incidente.id.substring(0, 8)}...
                </span>

                <span style={{ color: '#E0E1E6', fontSize: '14px' }}>
                  {formatDate(incidente.data)}
                </span>

                <span style={{
                  padding: '4px 8px',
                  backgroundColor: '#1B263B',
                  borderRadius: '4px',
                  color: '#00ade0',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {incidente.tipo}
                </span>

                <span style={{ color: '#E0E1E6', fontSize: '14px' }}>
                  {incidente.titular}
                </span>

                <span style={{
                  color: '#A5A8B1',
                  fontSize: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {incidente.arquivo}
                </span>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={incidente.isFalsoPositivo}
                      onChange={() => handleToggleFP(incidente.id, incidente.isFalsoPositivo)}
                      disabled={toggleMutation.isPending}
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
              Nenhum incidente encontrado
            </p>
          </div>
        )}

        {/* Paginação */}
        {data && data.totalPaginas > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px 24px',
            borderTop: '1px solid #1B263B'
          }}>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #1B263B',
                borderRadius: '4px',
                color: '#E0E1E6',
                fontSize: '12px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: currentPage === 1 ? 0.5 : 1
              }}
            >
              Anterior
            </button>

            <span style={{
              padding: '8px 16px',
              color: '#A5A8B1',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center'
            }}>
              Página {currentPage} de {data.totalPaginas}
            </span>

            <button
              onClick={() => setCurrentPage(Math.min(data.totalPaginas, currentPage + 1))}
              disabled={currentPage === data.totalPaginas}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: '1px solid #1B263B',
                borderRadius: '4px',
                color: '#E0E1E6',
                fontSize: '12px',
                cursor: currentPage === data.totalPaginas ? 'not-allowed' : 'pointer',
                opacity: currentPage === data.totalPaginas ? 0.5 : 1
              }}
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {/* Status de loading para toggles */}
      {toggleMutation.isPending && (
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
    </div>
  );
};

export default TelaIncidentesReport;
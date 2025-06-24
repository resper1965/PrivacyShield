import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface ConsolidadoData {
  totalDocumentos: number;
  totalTitulares: number;
  totalDadosSensiveis: number;
  distribuicaoPorTipo: Array<{
    tipo: string;
    quantidade: number;
  }>;
}

const fetchConsolidado = async (): Promise<ConsolidadoData> => {
  const response = await fetch('/api/v1/reports/lgpd/consolidado');
  if (!response.ok) throw new Error('Erro ao carregar dados consolidados');
  return response.json();
};

export const TelaConsolidado: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['consolidado'],
    queryFn: fetchConsolidado
  });

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/v1/reports/lgpd/export/consolidado');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio-consolidado.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
    }
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
          Erro ao carregar relatório consolidado
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Cards de Estatísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Total de Documentos */}
        <div style={{
          backgroundColor: '#112240',
          border: '1px solid #1B263B',
          borderRadius: '8px',
          padding: '24px'
        }}>
          {isLoading ? (
            <div>
              <div style={{
                height: '16px',
                backgroundColor: '#1B263B',
                borderRadius: '4px',
                marginBottom: '8px',
                animation: 'pulse 2s infinite'
              }} />
              <div style={{
                height: '32px',
                backgroundColor: '#1B263B',
                borderRadius: '4px',
                width: '60%'
              }} />
            </div>
          ) : (
            <div>
              <h3 style={{
                color: '#A5A8B1',
                fontSize: '14px',
                fontWeight: '500',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Total de Documentos
              </h3>
              <p style={{
                color: '#E0E1E6',
                fontSize: '32px',
                fontWeight: 'bold',
                margin: 0
              }}>
                {data?.totalDocumentos || 0}
              </p>
            </div>
          )}
        </div>

        {/* Total de Titulares */}
        <div style={{
          backgroundColor: '#112240',
          border: '1px solid #1B263B',
          borderRadius: '8px',
          padding: '24px'
        }}>
          {isLoading ? (
            <div>
              <div style={{
                height: '16px',
                backgroundColor: '#1B263B',
                borderRadius: '4px',
                marginBottom: '8px'
              }} />
              <div style={{
                height: '32px',
                backgroundColor: '#1B263B',
                borderRadius: '4px',
                width: '60%'
              }} />
            </div>
          ) : (
            <div>
              <h3 style={{
                color: '#A5A8B1',
                fontSize: '14px',
                fontWeight: '500',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Total de Titulares
              </h3>
              <p style={{
                color: '#E0E1E6',
                fontSize: '32px',
                fontWeight: 'bold',
                margin: 0
              }}>
                {data?.totalTitulares || 0}
              </p>
            </div>
          )}
        </div>

        {/* Total de Dados Sensíveis */}
        <div style={{
          backgroundColor: '#112240',
          border: '1px solid #1B263B',
          borderRadius: '8px',
          padding: '24px'
        }}>
          {isLoading ? (
            <div>
              <div style={{
                height: '16px',
                backgroundColor: '#1B263B',
                borderRadius: '4px',
                marginBottom: '8px'
              }} />
              <div style={{
                height: '32px',
                backgroundColor: '#1B263B',
                borderRadius: '4px',
                width: '60%'
              }} />
            </div>
          ) : (
            <div>
              <h3 style={{
                color: '#A5A8B1',
                fontSize: '14px',
                fontWeight: '500',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Total de Dados Sensíveis
              </h3>
              <p style={{
                color: '#E0E1E6',
                fontSize: '32px',
                fontWeight: 'bold',
                margin: 0
              }}>
                {data?.totalDadosSensiveis || 0}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Distribuição por Tipo de Dado */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            color: '#E0E1E6',
            fontSize: '18px',
            fontWeight: '600',
            margin: 0
          }}>
            Distribuição por Tipo de Dado
          </h3>
          
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 16px',
              backgroundColor: '#00ade0',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#0099c7'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#00ade0'}
          >
            Exportar CSV
          </button>
        </div>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{
                height: '40px',
                backgroundColor: '#1B263B',
                borderRadius: '4px'
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data?.distribuicaoPorTipo?.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                backgroundColor: '#0D1B2A',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#E0E1E6', fontSize: '14px' }}>
                  {item.tipo}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '100px',
                    height: '8px',
                    backgroundColor: '#1B263B',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(100, (item.quantidade / Math.max(...(data?.distribuicaoPorTipo?.map(d => d.quantidade) || [1]))) * 100)}%`,
                      height: '100%',
                      backgroundColor: '#00ade0'
                    }} />
                  </div>
                  <span style={{ color: '#A5A8B1', fontSize: '14px', minWidth: '40px', textAlign: 'right' }}>
                    {item.quantidade}
                  </span>
                </div>
              </div>
            )) || (
              <div style={{ textAlign: 'center', padding: '32px', color: '#A5A8B1' }}>
                Nenhum dado disponível
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default TelaConsolidado;
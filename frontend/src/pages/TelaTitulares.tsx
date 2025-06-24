import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Titular {
  id: string;
  nome: string;
  totalOcorrencias: number;
  arquivos: Array<{
    nome: string;
    valores: string[];
  }>;
}

interface TitularesData {
  titulares: Titular[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

const fetchTitulares = async (domain: string, cnpj: string, page: number = 1): Promise<TitularesData> => {
  const params = new URLSearchParams();
  if (domain) params.append('domain', domain);
  if (cnpj) params.append('cnpj', cnpj);
  params.append('page', page.toString());
  
  const response = await fetch(`/api/v1/reports/lgpd/titulares?${params}`);
  if (!response.ok) throw new Error('Erro ao carregar titulares');
  return response.json();
};

const maskCNPJ = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .substring(0, 18);
};

export const TelaTitulares: React.FC = () => {
  const [domain, setDomain] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [filters, setFilters] = useState({ domain: '', cnpj: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTitular, setSelectedTitular] = useState<Titular | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['titulares', filters.domain, filters.cnpj, currentPage],
    queryFn: () => fetchTitulares(filters.domain, filters.cnpj, currentPage)
  });

  const handleFilter = () => {
    setFilters({ domain, cnpj });
    setCurrentPage(1);
  };

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCnpj(maskCNPJ(e.target.value));
  };

  return (
    <div>
      {/* Formulário de Filtros */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: '16px',
          alignItems: 'end'
        }}>
          <div>
            <label style={{
              display: 'block',
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              Domínio
            </label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="empresa.com.br"
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
              onFocus={(e) => e.target.style.borderColor = '#00ade0'}
              onBlur={(e) => e.target.style.borderColor = '#1B263B'}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              color: '#E0E1E6',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              CNPJ
            </label>
            <input
              type="text"
              value={cnpj}
              onChange={handleCNPJChange}
              placeholder="00.000.000/0000-00"
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
              onFocus={(e) => e.target.style.borderColor = '#00ade0'}
              onBlur={(e) => e.target.style.borderColor = '#1B263B'}
            />
          </div>

          <button
            onClick={handleFilter}
            style={{
              padding: '12px 24px',
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
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabela de Titulares */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto',
          gap: '16px',
          padding: '16px 24px',
          backgroundColor: '#0D1B2A',
          borderBottom: '1px solid #1B263B'
        }}>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Titular
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Total Ocorrências
          </span>
          <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600' }}>
            Ações
          </span>
        </div>

        {/* Conteúdo */}
        {isLoading ? (
          <div style={{ padding: '24px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: '16px',
                padding: '16px 0',
                borderBottom: i < 3 ? '1px solid #1B263B' : 'none'
              }}>
                <div style={{ height: '20px', backgroundColor: '#1B263B', borderRadius: '4px' }} />
                <div style={{ height: '20px', width: '60px', backgroundColor: '#1B263B', borderRadius: '4px' }} />
                <div style={{ height: '20px', width: '80px', backgroundColor: '#1B263B', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ color: '#ef4444', margin: 0 }}>
              Erro ao carregar titulares
            </p>
          </div>
        ) : data?.titulares?.length ? (
          <div style={{ padding: '0 24px' }}>
            {data.titulares.map((titular, index) => (
              <div
                key={titular.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto auto',
                  gap: '16px',
                  padding: '16px 0',
                  borderBottom: index < data.titulares.length - 1 ? '1px solid #1B263B' : 'none'
                }}
              >
                <span style={{ color: '#E0E1E6', fontSize: '14px' }}>
                  {titular.nome}
                </span>
                <span style={{ color: '#A5A8B1', fontSize: '14px' }}>
                  {titular.totalOcorrencias}
                </span>
                <button
                  onClick={() => setSelectedTitular(titular)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: 'transparent',
                    border: '1px solid #00ade0',
                    borderRadius: '4px',
                    color: '#00ade0',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#00ade0';
                    e.target.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#00ade0';
                  }}
                >
                  Ver Detalhes
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ color: '#A5A8B1', margin: 0 }}>
              Nenhum titular encontrado
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
            {Array.from({ length: data.totalPaginas }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentPage === page ? '#00ade0' : 'transparent',
                  border: '1px solid #1B263B',
                  borderRadius: '4px',
                  color: currentPage === page ? 'white' : '#E0E1E6',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Detalhes */}
      {selectedTitular && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#112240',
            border: '1px solid #1B263B',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ color: '#E0E1E6', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Detalhes: {selectedTitular.nome}
              </h3>
              <button
                onClick={() => setSelectedTitular(null)}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#A5A8B1',
                  fontSize: '18px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {selectedTitular.arquivos.map((arquivo, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: '#0D1B2A',
                    border: '1px solid #1B263B',
                    borderRadius: '6px',
                    padding: '16px'
                  }}
                >
                  <h4 style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '600', margin: '0 0 8px 0' }}>
                    {arquivo.nome}
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {arquivo.valores.map((valor, vIndex) => (
                      <span
                        key={vIndex}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#1B263B',
                          borderRadius: '4px',
                          color: '#A5A8B1',
                          fontSize: '12px'
                        }}
                      >
                        {valor}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TelaTitulares;
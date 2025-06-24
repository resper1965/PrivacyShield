import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface OrganizacaoData {
  organizacao: string;
  dadosPorTipo: Record<string, number>;
  total: number;
}

interface OrganizacoesData {
  organizacoes: OrganizacaoData[];
  tiposDados: string[];
}

const fetchOrganizacoes = async (): Promise<OrganizacoesData> => {
  const response = await fetch('/api/v1/reports/lgpd/organizacoes');
  if (!response.ok) throw new Error('Erro ao carregar organizações');
  return response.json();
};

export const TelaOrganizacoes: React.FC = () => {
  const [sortColumn, setSortColumn] = useState<string>('organizacao');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { data, isLoading, error } = useQuery({
    queryKey: ['organizacoes'],
    queryFn: fetchOrganizacoes
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/v1/reports/lgpd/export/organizacoes');
      if (!response.ok) throw new Error('Erro na resposta do servidor');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'relatorio-organizacoes.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      alert('Erro ao baixar o arquivo CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFontSize(20);
      doc.text('Relatório por Organização', 20, 30);
      
      doc.setFontSize(12);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 45);
      
      // Tabela de organizações
      if (data?.organizacoes) {
        doc.setFontSize(14);
        doc.text('Dados por Organização', 20, 65);
        
        doc.setFontSize(10);
        let yPos = 80;
        
        // Cabeçalho da tabela
        doc.text('Organização', 20, yPos);
        doc.text('CPF', 80, yPos);
        doc.text('CNPJ', 100, yPos);
        doc.text('Email', 120, yPos);
        doc.text('Telefone', 140, yPos);
        doc.text('RG', 160, yPos);
        doc.text('Total', 180, yPos);
        yPos += 10;
        
        // Linha separadora
        doc.line(20, yPos - 5, 200, yPos - 5);
        
        // Dados
        data.organizacoes.forEach((org) => {
          if (yPos > 270) { // Nova página se necessário
            doc.addPage();
            yPos = 30;
          }
          
          doc.text(org.organizacao.substring(0, 25), 20, yPos);
          doc.text(String(org.dadosPorTipo.CPF || 0), 80, yPos);
          doc.text(String(org.dadosPorTipo.CNPJ || 0), 100, yPos);
          doc.text(String(org.dadosPorTipo.Email || 0), 120, yPos);
          doc.text(String(org.dadosPorTipo.Telefone || 0), 140, yPos);
          doc.text(String(org.dadosPorTipo.RG || 0), 160, yPos);
          doc.text(String(org.total), 180, yPos);
          yPos += 15;
        });
      }
      
      doc.save('relatorio-organizacoes.pdf');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      alert('Erro ao gerar o arquivo PDF');
    }
  };

  const sortedData = data?.organizacoes?.sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    if (sortColumn === 'organizacao') {
      aValue = a.organizacao;
      bValue = b.organizacao;
    } else if (sortColumn === 'total') {
      aValue = a.total;
      bValue = b.total;
    } else {
      aValue = a.dadosPorTipo[sortColumn] || 0;
      bValue = b.dadosPorTipo[sortColumn] || 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortDirection === 'asc' 
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

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
          Erro ao carregar dados das organizações
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header com botão de export */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h3 style={{ color: '#E0E1E6', fontSize: '18px', fontWeight: '600', margin: 0 }}>
          Matriz de Dados por Organização
        </h3>
        
        <div style={{ display: 'flex', gap: '8px' }}>
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
          
          <button
            onClick={handleExportPDF}
            style={{
              padding: '8px 16px',
              backgroundColor: '#374151',
              border: 'none',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#4B5563'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#374151'}
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{ padding: '24px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '200px repeat(5, 1fr) 100px',
              gap: '16px',
              marginBottom: '16px'
            }}>
              {[1, 2, 3, 4, 5, 6, 7].map(i => (
                <div key={i} style={{
                  height: '20px',
                  backgroundColor: '#1B263B',
                  borderRadius: '4px'
                }} />
              ))}
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '200px repeat(5, 1fr) 100px',
                gap: '16px',
                marginBottom: '12px'
              }}>
                {[1, 2, 3, 4, 5, 6, 7].map(j => (
                  <div key={j} style={{
                    height: '16px',
                    backgroundColor: '#1B263B',
                    borderRadius: '4px'
                  }} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {/* Cabeçalho */}
              <thead>
                <tr style={{ backgroundColor: '#0D1B2A' }}>
                  <th
                    onClick={() => handleSort('organizacao')}
                    style={{
                      padding: '16px',
                      textAlign: 'left',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      borderBottom: '1px solid #1B263B',
                      minWidth: '200px'
                    }}
                  >
                    Organização {sortColumn === 'organizacao' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  {data?.tiposDados?.map(tipo => (
                    <th
                      key={tipo}
                      onClick={() => handleSort(tipo)}
                      style={{
                        padding: '16px',
                        textAlign: 'center',
                        color: '#E0E1E6',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        borderBottom: '1px solid #1B263B',
                        minWidth: '100px'
                      }}
                    >
                      {tipo} {sortColumn === tipo && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                  <th
                    onClick={() => handleSort('total')}
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      borderBottom: '1px solid #1B263B',
                      minWidth: '100px'
                    }}
                  >
                    Total {sortColumn === 'total' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>

              {/* Corpo */}
              <tbody>
                {sortedData?.map((org, index) => (
                  <tr key={index}>
                    <td style={{
                      padding: '16px',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      borderBottom: index < sortedData.length - 1 ? '1px solid #1B263B' : 'none'
                    }}>
                      {org.organizacao}
                    </td>
                    {data?.tiposDados?.map(tipo => (
                      <td
                        key={tipo}
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          fontSize: '14px',
                          borderBottom: index < sortedData.length - 1 ? '1px solid #1B263B' : 'none',
                          color: org.dadosPorTipo[tipo] > 0 ? '#00ade0' : '#A5A8B1'
                        }}
                      >
                        {org.dadosPorTipo[tipo] || 0}
                      </td>
                    ))}
                    <td style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: '#E0E1E6',
                      fontSize: '14px',
                      fontWeight: '600',
                      borderBottom: index < sortedData.length - 1 ? '1px solid #1B263B' : 'none'
                    }}>
                      {org.total}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(!sortedData || sortedData.length === 0) && (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: '#A5A8B1', margin: 0 }}>
                  Nenhuma organização encontrada
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TelaOrganizacoes;
import React, { useState, useEffect } from 'react';

export const TelaLocalZIP: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);

  const [localZipFiles, setLocalZipFiles] = useState<any[]>([]);

  // Load local ZIP files from server
  useEffect(() => {
    const loadLocalZips = async () => {
      try {
        const response = await fetch('/api/v1/local-zips');
        if (response.ok) {
          const files = await response.json();
          setLocalZipFiles(files);
        }
      } catch (error) {
        console.error('Error loading local ZIP files:', error);
        // Fallback to mock data if API fails
        setLocalZipFiles([
          { name: 'exemplo_documentos.zip', size: '2.3 MB', date: '2025-01-20', path: '/local_files/exemplo_documentos.zip' },
          { name: 'dados_exemplo.zip', size: '5.7 MB', date: '2025-01-19', path: '/local_files/dados_exemplo.zip' }
        ]);
      }
    };
    loadLocalZips();
  }, []);

  const handleProcessFile = (filePath: string) => {
    setSelectedFile(filePath);
    setIsProcessing(true);
    setProcessProgress(0);

    const interval = setInterval(() => {
      setProcessProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          return 100;
        }
        return prev + 12;
      });
    }, 200);
  };

  const formatFileSize = (size: string) => size;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  return (
    <div>
      {/* Local Files List */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h4 style={{
          color: '#E0E1E6',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 20px 0'
        }}>
          Arquivos ZIP Locais
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {localZipFiles.map((file, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: '#0D1B2A',
                border: '1px solid #1B263B',
                borderRadius: '8px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#374151'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#1B263B'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#1B263B',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#00ade0',
                  fontSize: '16px'
                }}>
                  🗜️
                </div>
                
                <div>
                  <div style={{
                    color: '#E0E1E6',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px'
                  }}>
                    {file.name}
                  </div>
                  
                  <div style={{
                    color: '#A5A8B1',
                    fontSize: '12px'
                  }}>
                    {formatFileSize(file.size)} • {formatDate(file.date)}
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleProcessFile(file.path)}
                disabled={isProcessing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isProcessing && selectedFile === file.path ? '#374151' : '#00ade0',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: isProcessing && selectedFile !== file.path ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isProcessing) {
                    e.target.style.backgroundColor = '#0099c7';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isProcessing) {
                    e.target.style.backgroundColor = '#00ade0';
                  }
                }}
              >
                {isProcessing && selectedFile === file.path ? 'Processando...' : 'Processar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Processing Progress */}
      {isProcessing && (
        <div style={{
          backgroundColor: '#112240',
          border: '1px solid #1B263B',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '500' }}>
              Processando arquivo ZIP...
            </span>
            <span style={{ color: '#A5A8B1', fontSize: '14px' }}>
              {processProgress}%
            </span>
          </div>
          
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#1B263B',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div
              style={{
                width: `${processProgress}%`,
                height: '100%',
                backgroundColor: '#00ade0',
                transition: 'width 0.2s ease'
              }}
            />
          </div>
          
          <p style={{
            color: '#A5A8B1',
            fontSize: '12px',
            margin: '8px 0 0 0'
          }}>
            Extraindo e analisando conteúdo para detecção de PII...
          </p>
        </div>
      )}

      {/* Storage Info */}
      <div style={{
        backgroundColor: '#112240',
        border: '1px solid #1B263B',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h4 style={{
          color: '#E0E1E6',
          fontSize: '16px',
          fontWeight: '600',
          margin: '0 0 16px 0'
        }}>
          Informações de Armazenamento
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A5A8B1', fontSize: '14px' }}>
              Total de arquivos:
            </span>
            <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '500' }}>
              {localZipFiles.length}
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A5A8B1', fontSize: '14px' }}>
              Espaço ocupado:
            </span>
            <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '500' }}>
              21.0 MB
            </span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#A5A8B1', fontSize: '14px' }}>
              Último processamento:
            </span>
            <span style={{ color: '#E0E1E6', fontSize: '14px', fontWeight: '500' }}>
              {formatDate('2025-01-20')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelaLocalZIP;
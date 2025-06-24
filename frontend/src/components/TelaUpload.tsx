import React, { useState } from 'react';

export const TelaUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const file = files[0];
    if (file) {
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div>
      {/* Upload Area */}
      <div
        style={{
          backgroundColor: '#112240',
          border: `2px dashed ${dragActive ? '#00ade0' : '#1B263B'}`,
          borderRadius: '12px',
          padding: '48px 24px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          marginBottom: '24px'
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
          accept=".txt,.pdf,.doc,.docx,.xls,.xlsx"
        />
        
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: '#1B263B',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#00ade0',
          fontSize: '24px'
        }}>
          📁
        </div>
        
        <h3 style={{
          color: '#E0E1E6',
          fontSize: '18px',
          fontWeight: '600',
          margin: '0 0 8px 0'
        }}>
          {dragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
        </h3>
        
        <p style={{
          color: '#A5A8B1',
          fontSize: '14px',
          margin: '0 0 16px 0'
        }}>
          Suporta: TXT, PDF, DOC, DOCX, XLS, XLSX
        </p>
        
        <button
          style={{
            padding: '12px 24px',
            backgroundColor: '#00ade0',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0099c7'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#00ade0'}
        >
          Selecionar Arquivos
        </button>
      </div>

      {/* Upload Progress */}
      {isUploading && (
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
              Fazendo upload...
            </span>
            <span style={{ color: '#A5A8B1', fontSize: '14px' }}>
              {uploadProgress}%
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
                width: `${uploadProgress}%`,
                height: '100%',
                backgroundColor: '#00ade0',
                transition: 'width 0.2s ease'
              }}
            />
          </div>
        </div>
      )}

      {/* Recent Files */}
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
          Arquivos Recentes
        </h4>
        
        <div style={{ color: '#A5A8B1', fontSize: '14px', textAlign: 'center', padding: '32px' }}>
          Nenhum arquivo carregado ainda
        </div>
      </div>
    </div>
  );
};

export default TelaUpload;
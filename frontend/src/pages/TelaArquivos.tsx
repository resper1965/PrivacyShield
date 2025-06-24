import React from 'react';
import TabsArquivos from '../components/TabsArquivos';
import TelaUpload from '../components/TelaUpload';
import TelaUploadZIP from '../components/TelaUploadZIP';
import TelaLocalZIP from '../components/TelaLocalZIP';

export const TelaArquivos: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          color: '#E0E1E6', 
          fontSize: '28px', 
          fontWeight: '600',
          margin: '0 0 8px 0'
        }}>
          Gerenciar Arquivos
        </h1>
        <p style={{ 
          color: '#A5A8B1', 
          fontSize: '16px',
          margin: 0
        }}>
          Upload e análise de arquivos para detecção de PII
        </p>
      </div>

      {/* Tabs */}
      <TabsArquivos
        tabs={[
          { key: 'upload', label: 'Upload' },
          { key: 'zip', label: 'Upload ZIP' },
          { key: 'local', label: 'Local ZIP' },
        ]}
      >
        {(active) => {
          if (active === 'upload') return <TelaUpload />;
          if (active === 'zip') return <TelaUploadZIP />;
          return <TelaLocalZIP />;
        }}
      </TabsArquivos>
    </div>
  );
};

export default TelaArquivos;
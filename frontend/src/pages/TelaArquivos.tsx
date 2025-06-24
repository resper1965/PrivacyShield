import React from 'react';
import TabsArquivos from '../components/TabsArquivos';
import TelaUpload from '../components/TelaUpload';
import TelaUploadZIP from '../components/TelaUploadZIP';
import TelaLocalZIP from '../components/TelaLocalZIP';
import TelaAnaliseLocal from '../components/TelaAnaliseLocal';

export const TelaArquivos: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <TabsArquivos
        tabs={[
          { key: 'upload', label: 'Upload' },
          { key: 'zip', label: 'Upload ZIP' },
          { key: 'local', label: 'Local ZIP' },
          { key: 'folders', label: 'Análise de Pastas' },
        ]}
      >
        {(active) => {
          if (active === 'upload') return <TelaUpload />;
          if (active === 'zip') return <TelaUploadZIP />;
          if (active === 'local') return <TelaLocalZIP />;
          if (active === 'folders') return <TelaAnaliseLocal />;
          return <TelaUpload />;
        }}
      </TabsArquivos>
    </div>
  );
};

export default TelaArquivos;
import React from 'react';
import TabsRelatorios from '../components/TabsRelatorios';
import TelaConsolidado from './TelaConsolidado';
import TelaTitulares from './TelaTitulares';
import TelaOrganizacoes from './TelaOrganizacoes';
import TelaIncidentesReport from './TelaIncidentesReport';

export const TelaRelatorios: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <TabsRelatorios
        tabs={[
          { key: 'consolidado', label: 'Consolidado' },
          { key: 'titulares', label: 'Por Titular' },
          { key: 'organizacoes', label: 'Por Organização' },
          { key: 'incidentes', label: 'Incidentes & Falsos Positivos' },
        ]}
        renderTab={(key) => {
          if (key === 'consolidado') return <TelaConsolidado />;
          if (key === 'titulares') return <TelaTitulares />;
          if (key === 'organizacoes') return <TelaOrganizacoes />;
          return <TelaIncidentesReport />;
        }}
      />
    </div>
  );
};

export default TelaRelatorios;
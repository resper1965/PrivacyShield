import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import TelaCadastroCaso from './pages/TelaCadastroCaso';
import { Dashboard } from './pages/Dashboard';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/casos" element={<TelaCadastroCaso />} />
          <Route path="/arquivos" element={<div><h1>Arquivos - Em desenvolvimento</h1></div>} />
          <Route path="/relatorio" element={<div><h1>Relatório - Em desenvolvimento</h1></div>} />
          <Route path="/configuracao" element={<div><h1>Configuração - Em desenvolvimento</h1></div>} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default AppRoutes;
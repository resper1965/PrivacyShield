import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import TelaCadastroCaso from './pages/TelaCadastroCaso';
import DashboardPage from './pages/DashboardPage';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/casos" element={<TelaCadastroCaso />} />
          <Route path="/arquivos" element={<div><h1>Arquivos - Em desenvolvimento</h1></div>} />
          <Route path="/processamento" element={<div><h1>Processamento - Em desenvolvimento</h1></div>} />
          <Route path="/relatorios" element={<div><h1>Relatórios - Em desenvolvimento</h1></div>} />
          <Route path="/configuracao" element={<div><h1>Configuração - Em desenvolvimento</h1></div>} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default AppRoutes;
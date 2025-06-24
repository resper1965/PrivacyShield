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
          <Route path="/upload" element={<div><h1>Upload - Em desenvolvimento</h1></div>} />
          <Route path="/uploads" element={<div><h1>Meus Uploads - Em desenvolvimento</h1></div>} />
          <Route path="/detections" element={<div><h1>Detecções - Em desenvolvimento</h1></div>} />
          <Route path="/reports/titulares" element={<div><h1>Relatório Titulares - Em desenvolvimento</h1></div>} />
          <Route path="/incidents/new" element={<TelaCadastroCaso />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default AppRoutes;
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import TelaCadastroCaso from './pages/TelaCadastroCaso';
import DashboardPage from './pages/DashboardPage';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/incidents/new" element={<TelaCadastroCaso />} />
          <Route path="/files/upload" element={<div className="p-6"><h1 className="text-2xl font-bold">Upload - Em desenvolvimento</h1></div>} />
          <Route path="/files/my-uploads" element={<div className="p-6"><h1 className="text-2xl font-bold">Meus Uploads - Em desenvolvimento</h1></div>} />
          <Route path="/detections" element={<div className="p-6"><h1 className="text-2xl font-bold">Detecções - Em desenvolvimento</h1></div>} />
          <Route path="/reports/titulares" element={<div className="p-6"><h1 className="text-2xl font-bold">Relatório Titulares - Em desenvolvimento</h1></div>} />
          <Route path="/incidents/create" element={<TelaCadastroCaso />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
};

export default AppRoutes;
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import TelaCadastroCaso from './pages/TelaCadastroCaso';
import { WebSocketProvider } from './hooks/useWebSocket';
import './App.css';

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/casos" element={<TelaCadastroCaso />} />
            <Route path="/arquivos" element={<div className="p-6"><h1 className="text-h1">Arquivos - Em desenvolvimento</h1></div>} />
            <Route path="/relatorio" element={<div className="p-6"><h1 className="text-h1">Relatório - Em desenvolvimento</h1></div>} />
            <Route path="/configuracao" element={<div className="p-6"><h1 className="text-h1">Configuração - Em desenvolvimento</h1></div>} />
          </Routes>
        </Layout>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
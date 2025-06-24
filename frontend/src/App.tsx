import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SimpleLayout } from './components/SimpleLayout';
import { Dashboard } from './pages/Dashboard';
import TelaCadastroCaso from './pages/TelaCadastroCaso';
import { WebSocketProvider } from './hooks/useWebSocket';

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <SimpleLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/casos" element={<TelaCadastroCaso />} />
            <Route path="/arquivos" element={<div style={{color: '#E0E1E6'}}><h1>Arquivos - Em desenvolvimento</h1></div>} />
            <Route path="/relatorio" element={<div style={{color: '#E0E1E6'}}><h1>Relatório - Em desenvolvimento</h1></div>} />
            <Route path="/configuracao" element={<div style={{color: '#E0E1E6'}}><h1>Configuração - Em desenvolvimento</h1></div>} />
          </Routes>
        </SimpleLayout>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
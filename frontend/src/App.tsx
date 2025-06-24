import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SimpleLayout } from './components/SimpleLayout';
import { SimpleDashboard } from './pages/SimpleDashboard';
import TelaCadastroCaso from './pages/TelaCadastroCaso';
import TelaArquivos from './pages/TelaArquivos';
import { WebSocketProvider } from './hooks/useWebSocket';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <Router>
          <SimpleLayout>
            <Routes>
              <Route path="/" element={<SimpleDashboard />} />
              <Route path="/dashboard" element={<SimpleDashboard />} />
              <Route path="/incidentes" element={<TelaCadastroCaso />} />
              <Route path="/incidents" element={<TelaCadastroCaso />} />
              <Route path="/arquivos" element={<TelaArquivos />} />
              <Route path="/processamento" element={<div style={{color: '#E0E1E6'}}><h1>Processamento - Em desenvolvimento</h1></div>} />
              <Route path="/relatorio" element={<div style={{color: '#E0E1E6'}}><h1>Relatório - Em desenvolvimento</h1></div>} />
              <Route path="/configuracao" element={<div style={{color: '#E0E1E6'}}><h1>Configuração - Em desenvolvimento</h1></div>} />
            </Routes>
          </SimpleLayout>
        </Router>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
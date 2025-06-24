import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SimpleLayout } from './components/SimpleLayout';
import { SimpleDashboard } from './pages/SimpleDashboard';
import TelaCadastroCaso from './pages/TelaCadastroCaso';
import TelaArquivos from './pages/TelaArquivos';
import TelaAnalise from './pages/TelaAnalise';
import TelaRelatorios from './pages/TelaRelatorios';
import TelaConfiguracoes from './pages/TelaConfiguracoes';
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
              <Route path="/analise" element={<TelaAnalise />} />
              <Route path="/relatorio" element={<TelaRelatorios />} />
              <Route path="/configuracao" element={<TelaConfiguracoes />} />
            </Routes>
          </SimpleLayout>
        </Router>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
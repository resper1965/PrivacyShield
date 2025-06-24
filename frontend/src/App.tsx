import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/files/Upload';
import { MyUploads } from './pages/files/MyUploads';
import { QueueMonitor } from './pages/jobs/QueueMonitor';
import { JobHistory } from './pages/jobs/JobHistory';
import { Detections } from './pages/Detections';
import { LGPDReport } from './pages/reports/LGPDReport';
import { TitularesReport } from './pages/reports/TitularesReport';
import { OrganizationsReport } from './pages/reports/OrganizationsReport';
import { IncidentsReport } from './pages/reports/IncidentsReport';
import { CreateIncident } from './pages/incidents/CreateIncident';
import { IncidentDetail } from './pages/incidents/IncidentDetail';
import { IncidentsList } from './pages/incidents/IncidentsList';
import { DirectorySources } from './pages/DirectorySources';
import { RegexPatterns } from './pages/RegexPatterns';
import { Settings } from './pages/Settings';
import { Users } from './pages/admin/Users';
import { Environment } from './pages/admin/Environment';
import { Logs } from './pages/admin/Logs';
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
            
            {/* Files */}
            <Route path="/files/upload" element={<Upload />} />
            <Route path="/files/my-uploads" element={<MyUploads />} />
            
            {/* Jobs */}
            <Route path="/jobs/queue" element={<QueueMonitor />} />
            <Route path="/jobs/history" element={<JobHistory />} />
            
            {/* Detections */}
            <Route path="/detections" element={<Detections />} />
            
            {/* Incidents */}
            <Route path="/incidents/create" element={<CreateIncident />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route path="/incidents" element={<IncidentsList />} />
            
            {/* Reports */}
            <Route path="/reports/lgpd" element={<LGPDReport />} />
            <Route path="/reports/titulares" element={<TitularesReport />} />
            <Route path="/reports/organizations" element={<OrganizationsReport />} />
            <Route path="/reports/incidents" element={<IncidentsReport />} />
            
            {/* Sources */}
            <Route path="/sources" element={<DirectorySources />} />
            
            {/* Patterns */}
            <Route path="/patterns" element={<RegexPatterns />} />
            
            {/* Settings */}
            <Route path="/settings" element={<Settings />} />
            
            {/* Admin */}
            <Route path="/admin/users" element={<Users />} />
            <Route path="/admin/environment" element={<Environment />} />
            <Route path="/admin/logs" element={<Logs />} />
          </Routes>
        </Layout>
      </Router>
    </WebSocketProvider>
  );
}

export default App;
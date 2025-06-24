import React, { useState, useEffect } from 'react';
import { Download, Search, Filter, FileText, AlertTriangle, Info, XCircle, CheckCircle } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  module: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export const Logs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    level: '',
    module: '',
    startDate: '',
    endDate: '',
    userId: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const itemsPerPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [currentPage, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from /api/v1/logs
      const mockLogs: LogEntry[] = [
        {
          id: 'log_001',
          timestamp: '2025-06-24T01:30:00Z',
          level: 'info',
          message: 'Incident created successfully',
          module: 'incidents',
          userId: 'user_1',
          sessionId: 'session_123',
          metadata: { incidentId: 'inc_001', organizationId: 'org_001' }
        },
        {
          id: 'log_002',
          timestamp: '2025-06-24T01:25:00Z',
          level: 'warning',
          message: 'ClamAV service unavailable, using fallback scanner',
          module: 'virus-scanner',
          metadata: { host: 'localhost', port: 3310 }
        },
        {
          id: 'log_003',
          timestamp: '2025-06-24T01:20:00Z',
          level: 'error',
          message: 'Failed to process ZIP file: Invalid format',
          module: 'zip-processor',
          userId: 'user_2',
          sessionId: 'session_124',
          metadata: { fileName: 'corrupted.zip', errorCode: 'INVALID_FORMAT' }
        },
        {
          id: 'log_004',
          timestamp: '2025-06-24T01:15:00Z',
          level: 'info',
          message: 'PII detection completed',
          module: 'pii-detector',
          userId: 'user_1',
          sessionId: 'session_125',
          metadata: { 
            fileName: 'customer_data.zip', 
            detections: 42, 
            processingTime: 1250 
          }
        },
        {
          id: 'log_005',
          timestamp: '2025-06-24T01:10:00Z',
          level: 'warning',
          message: 'High number of failed login attempts detected',
          module: 'auth',
          metadata: { ip: '192.168.1.100', attempts: 5 }
        },
        {
          id: 'log_006',
          timestamp: '2025-06-24T01:05:00Z',
          level: 'info',
          message: 'Database backup completed successfully',
          module: 'backup',
          metadata: { backupSize: '2.4GB', duration: 180 }
        },
        {
          id: 'log_007',
          timestamp: '2025-06-24T01:00:00Z',
          level: 'error',
          message: 'OpenAI API rate limit exceeded',
          module: 'ai-validator',
          metadata: { remainingQuota: 0, resetTime: '2025-06-24T02:00:00Z' }
        },
        {
          id: 'log_008',
          timestamp: '2025-06-24T00:55:00Z',
          level: 'debug',
          message: 'Regex pattern match found',
          module: 'pattern-matcher',
          metadata: { pattern: 'CPF', matches: 3, text: 'customer_info.txt' }
        }
      ];

      // Apply filters
      let filteredLogs = mockLogs;
      
      if (filters.search) {
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(filters.search.toLowerCase()) ||
          log.module.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      
      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }
      
      if (filters.module) {
        filteredLogs = filteredLogs.filter(log => log.module === filters.module);
      }
      
      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }
      
      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) >= new Date(filters.startDate)
        );
      }
      
      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => 
          new Date(log.timestamp) <= new Date(filters.endDate)
        );
      }

      setLogs(filteredLogs);
      setTotalPages(Math.ceil(filteredLogs.length / itemsPerPage));
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = () => {
    const filteredLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    
    const csvContent = [
      ['Timestamp', 'Level', 'Module', 'Message', 'User ID', 'Session ID', 'Metadata'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.level,
        log.module,
        `"${log.message}"`,
        log.userId || '',
        log.sessionId || '',
        `"${JSON.stringify(log.metadata || {})}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'debug':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    const colors = {
      error: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      debug: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
    };
    return colors[level as keyof typeof colors] || colors.debug;
  };

  const modules = [...new Set(logs.map(log => log.module))];
  const displayedLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1" style={{ color: 'var(--color-text-primary)' }}>
          Logs & Auditoria
        </h1>
        <button
          onClick={handleExportLogs}
          className="btn btn-primary"
        >
          <Download size={16} />
          Exportar Logs
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div>
            <label className="form-label">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: 'var(--color-text-secondary)' }} />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Buscar mensagem..."
                className="form-input pl-10"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Nível</label>
            <select
              value={filters.level}
              onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value }))}
              className="form-select"
            >
              <option value="">Todos</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <div>
            <label className="form-label">Módulo</label>
            <select
              value={filters.module}
              onChange={(e) => setFilters(prev => ({ ...prev, module: e.target.value }))}
              className="form-select"
            >
              <option value="">Todos</option>
              {modules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Data Inicial</label>
            <input
              type="datetime-local"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Data Final</label>
            <input
              type="datetime-local"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">User ID</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
              placeholder="user_123"
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Nível</th>
              <th>Módulo</th>
              <th>Mensagem</th>
              <th>Usuário</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((log) => (
              <tr key={log.id}>
                <td>
                  <span className="text-small font-mono" style={{ color: 'var(--color-text-primary)' }}>
                    {formatTimestamp(log.timestamp)}
                  </span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {getLevelIcon(log.level)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                  </div>
                </td>
                <td>
                  <code 
                    className="text-small px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: 'var(--color-background)', 
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {log.module}
                  </code>
                </td>
                <td>
                  <div className="max-w-lg">
                    <p className="text-small line-clamp-2" style={{ color: 'var(--color-text-primary)' }}>
                      {log.message}
                    </p>
                  </div>
                </td>
                <td>
                  <span className="text-small" style={{ color: 'var(--color-text-primary)' }}>
                    {log.userId || '-'}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Ver detalhes"
                  >
                    <FileText size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
              Página {currentPage} de {totalPages} - {logs.length} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-small rounded disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--color-border)', 
                  color: 'var(--color-text-primary)' 
                }}
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-small rounded disabled:opacity-50"
                style={{ 
                  backgroundColor: 'var(--color-border)', 
                  color: 'var(--color-text-primary)' 
                }}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl">
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="text-h3" style={{ color: 'var(--color-text-primary)' }}>
                Detalhes do Log
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded hover:bg-opacity-50"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Timestamp</label>
                  <p className="text-body font-mono" style={{ color: 'var(--color-text-primary)' }}>
                    {formatTimestamp(selectedLog.timestamp)}
                  </p>
                </div>
                
                <div>
                  <label className="form-label">Nível</label>
                  <div className="flex items-center gap-2">
                    {getLevelIcon(selectedLog.level)}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(selectedLog.level)}`}>
                      {selectedLog.level.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="form-label">Módulo</label>
                  <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                    {selectedLog.module}
                  </p>
                </div>
                
                <div>
                  <label className="form-label">ID do Log</label>
                  <p className="text-body font-mono" style={{ color: 'var(--color-text-primary)' }}>
                    {selectedLog.id}
                  </p>
                </div>
                
                {selectedLog.userId && (
                  <div>
                    <label className="form-label">User ID</label>
                    <p className="text-body font-mono" style={{ color: 'var(--color-text-primary)' }}>
                      {selectedLog.userId}
                    </p>
                  </div>
                )}
                
                {selectedLog.sessionId && (
                  <div>
                    <label className="form-label">Session ID</label>
                    <p className="text-body font-mono" style={{ color: 'var(--color-text-primary)' }}>
                      {selectedLog.sessionId}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="form-label">Mensagem</label>
                <div 
                  className="p-4 rounded-lg border"
                  style={{ 
                    backgroundColor: 'var(--color-background)', 
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  {selectedLog.message}
                </div>
              </div>

              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <label className="form-label">Metadata</label>
                  <pre 
                    className="p-4 rounded-lg border text-small font-mono overflow-auto max-h-60"
                    style={{ 
                      backgroundColor: 'var(--color-background)', 
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end p-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={() => setSelectedLog(null)}
                className="btn btn-secondary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {logs.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12" style={{ color: 'var(--color-text-secondary)' }} />
          <h3 className="mt-2 text-h3" style={{ color: 'var(--color-text-primary)' }}>
            Nenhum log encontrado
          </h3>
          <p className="mt-1 text-body" style={{ color: 'var(--color-text-secondary)' }}>
            Ajuste os filtros para ver logs específicos.
          </p>
        </div>
      )}
    </div>
  );
};
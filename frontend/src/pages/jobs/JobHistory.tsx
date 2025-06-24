import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, Eye, Download } from 'lucide-react';

interface HistoryJob {
  id: string;
  type: 'Archive' | 'File';
  status: 'completed' | 'failed';
  data: any;
  createdAt: string;
  completedAt: string;
  duration: number; // in seconds
  failedReason?: string;
  logs?: string;
}

export const JobHistory: React.FC = () => {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState<HistoryJob | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchJobHistory();
  }, [currentPage, filters]);

  const fetchJobHistory = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from API
      const mockJobs: HistoryJob[] = [
        {
          id: 'job_hist_001',
          type: 'Archive',
          status: 'completed',
          data: { originalName: 'customer_data_2025.zip', totalFiles: 15 },
          createdAt: '2025-06-24T01:00:00Z',
          completedAt: '2025-06-24T01:02:30Z',
          duration: 150,
          logs: 'Archive processed successfully. Extracted 15 files, found 42 PII detections.'
        },
        {
          id: 'job_hist_002',
          type: 'File',
          status: 'completed',
          data: { filename: 'customer_records.txt', zipSource: 'customer_data_2025.zip' },
          createdAt: '2025-06-24T01:01:00Z',
          completedAt: '2025-06-24T01:01:45Z',
          duration: 45,
          logs: 'File processed successfully. Found 8 PII detections.'
        },
        {
          id: 'job_hist_003',
          type: 'Archive',
          status: 'failed',
          data: { originalName: 'corrupted_file.zip' },
          createdAt: '2025-06-24T00:45:00Z',
          completedAt: '2025-06-24T00:45:15Z',
          duration: 15,
          failedReason: 'Invalid ZIP file format',
          logs: 'ERROR: ZIP file validation failed. File appears to be corrupted or not a valid ZIP archive.'
        },
        {
          id: 'job_hist_004',
          type: 'File',
          status: 'failed',
          data: { filename: 'large_document.pdf', zipSource: 'documents.zip' },
          createdAt: '2025-06-24T00:30:00Z',
          completedAt: '2025-06-24T00:32:00Z',
          duration: 120,
          failedReason: 'File size exceeds limit',
          logs: 'ERROR: File size (150MB) exceeds maximum allowed size (100MB).'
        },
        {
          id: 'job_hist_005',
          type: 'Archive',
          status: 'completed',
          data: { originalName: 'employee_data.zip', totalFiles: 8 },
          createdAt: '2025-06-23T15:30:00Z',
          completedAt: '2025-06-23T15:31:20Z',
          duration: 80,
          logs: 'Archive processed successfully. Extracted 8 files, found 15 PII detections.'
        }
      ];

      // Apply filters
      let filteredJobs = mockJobs;
      
      if (filters.type) {
        filteredJobs = filteredJobs.filter(job => job.type === filters.type);
      }
      
      if (filters.status) {
        filteredJobs = filteredJobs.filter(job => job.status === filters.status);
      }
      
      if (filters.startDate) {
        filteredJobs = filteredJobs.filter(job => 
          new Date(job.createdAt) >= new Date(filters.startDate)
        );
      }
      
      if (filters.endDate) {
        filteredJobs = filteredJobs.filter(job => 
          new Date(job.createdAt) <= new Date(filters.endDate)
        );
      }

      setJobs(filteredJobs);
      setTotalPages(Math.ceil(filteredJobs.length / itemsPerPage));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching job history:', error);
      setLoading(false);
    }
  };

  const handleViewLogs = (job: HistoryJob) => {
    setSelectedJob(job);
    setShowLogs(true);
  };

  const handleExportLogs = (job: HistoryJob) => {
    if (job.logs) {
      const blob = new Blob([job.logs], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `job_${job.id}_logs.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: string) => {
    return status === 'completed' 
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <XCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusLabel = (status: string) => {
    return status === 'completed' ? 'Concluído' : 'Falhou';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Histórico de Jobs
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo
            </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="Archive">Archive</option>
              <option value="File">File</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="completed">Concluído</option>
              <option value="failed">Falhou</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Jobs History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Job ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Duração
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Concluído
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900 dark:text-white">
                      {job.id}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      job.type === 'Archive' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200'
                    }`}>
                      {job.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getStatusLabel(job.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white max-w-xs">
                      <div>
                        {job.type === 'Archive' ? job.data.originalName : job.data.filename}
                      </div>
                      {job.failedReason && (
                        <div className="text-xs text-red-600 mt-1">
                          {job.failedReason}
                        </div>
                      )}
                      {job.data.totalFiles && (
                        <div className="text-xs text-gray-500 mt-1">
                          {job.data.totalFiles} arquivos
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDuration(job.duration)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {formatDate(job.completedAt)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewLogs(job)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Ver logs"
                      >
                        <Eye size={16} />
                      </button>
                      {job.logs && (
                        <button
                          onClick={() => handleExportLogs(job)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Exportar logs"
                        >
                          <Download size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Mostrando {jobs.length} jobs - Página {currentPage} de {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs Modal */}
      {showLogs && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Logs do Job: {selectedJob.id}
              </h3>
              <button
                onClick={() => setShowLogs(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[60vh]">
              <pre className="text-sm bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto">
                {selectedJob.logs || 'Nenhum log disponível'}
              </pre>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => handleExportLogs(selectedJob)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Exportar Logs
              </button>
              <button
                onClick={() => setShowLogs(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {jobs.length === 0 && (
        <div className="text-center py-12">
          <Clock className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhum job encontrado
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ajuste os filtros ou aguarde o processamento de novos jobs.
          </p>
        </div>
      )}
    </div>
  );
};
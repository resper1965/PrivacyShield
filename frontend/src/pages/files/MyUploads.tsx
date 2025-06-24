import React, { useState, useEffect } from 'react';
import { FileText, Download, RefreshCw, Trash2, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface UploadRecord {
  id: string;
  filename: string;
  originalName: string;
  uploadedAt: string;
  status: 'scanning' | 'clean' | 'infected' | 'processed' | 'error';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  size: number;
  totalDetections?: number;
  sessionId: string;
}

export const MyUploads: React.FC = () => {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUploads();
  }, [currentPage, filter]);

  const fetchUploads = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from API
      const mockUploads: UploadRecord[] = [
        {
          id: '1',
          filename: 'customer_data_2025.zip',
          originalName: 'customer_data_2025.zip',
          uploadedAt: '2025-06-24T01:00:00Z',
          status: 'processed',
          riskLevel: 'high',
          size: 2048576,
          totalDetections: 15,
          sessionId: 'session_123'
        },
        {
          id: '2',
          filename: 'employee_records.zip',
          originalName: 'employee_records.zip',
          uploadedAt: '2025-06-23T15:30:00Z',
          status: 'processed',
          riskLevel: 'critical',
          size: 5242880,
          totalDetections: 42,
          sessionId: 'session_124'
        },
        {
          id: '3',
          filename: 'backup_database.zip',
          originalName: 'backup_database.zip',
          uploadedAt: '2025-06-23T10:15:00Z',
          status: 'scanning',
          size: 10485760,
          sessionId: 'session_125'
        },
        {
          id: '4',
          filename: 'marketing_data.zip',
          originalName: 'marketing_data.zip',
          uploadedAt: '2025-06-22T14:20:00Z',
          status: 'processed',
          riskLevel: 'medium',
          size: 1048576,
          totalDetections: 8,
          sessionId: 'session_126'
        },
        {
          id: '5',
          filename: 'suspicious_file.zip',
          originalName: 'suspicious_file.zip',
          uploadedAt: '2025-06-22T09:45:00Z',
          status: 'infected',
          size: 512000,
          sessionId: 'session_127'
        }
      ];

      // Filter uploads based on selected filter
      const filteredUploads = filter === 'all' 
        ? mockUploads 
        : mockUploads.filter(upload => upload.status === filter);

      setUploads(filteredUploads);
      setTotalPages(Math.ceil(filteredUploads.length / itemsPerPage));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching uploads:', error);
      setLoading(false);
    }
  };

  const handleReprocess = async (uploadId: string) => {
    try {
      // Implementation for reprocessing
      console.log('Reprocessing upload:', uploadId);
      // API call to reprocess
    } catch (error) {
      console.error('Error reprocessing upload:', error);
    }
  };

  const handleDelete = async (uploadId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este upload?')) {
      try {
        // Implementation for deletion
        console.log('Deleting upload:', uploadId);
        setUploads(uploads.filter(upload => upload.id !== uploadId));
      } catch (error) {
        console.error('Error deleting upload:', error);
      }
    }
  };

  const handleDownload = (uploadId: string) => {
    // Implementation for download
    console.log('Downloading upload:', uploadId);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scanning':
        return <Clock className="h-4 w-4 text-yellow-500 animate-spin" />;
      case 'clean':
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'infected':
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      scanning: 'Processando',
      clean: 'Limpo',
      infected: 'Infectado',
      processed: 'Processado',
      error: 'Erro'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null;
    
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
      critical: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[riskLevel as keyof typeof colors]}`}>
        {riskLevel.toUpperCase()}
      </span>
    );
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
          Meus Uploads
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtrar por status:
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="scanning">Processando</option>
            <option value="processed">Processado</option>
            <option value="clean">Limpo</option>
            <option value="infected">Infectado</option>
            <option value="error">Erro</option>
          </select>
        </div>
      </div>

      {/* Uploads Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Arquivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Risco
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Detecções
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {uploads.map((upload) => (
                <tr key={upload.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {upload.originalName}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatFileSize(upload.size)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900 dark:text-white">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {formatDate(upload.uploadedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(upload.status)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getStatusLabel(upload.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRiskBadge(upload.riskLevel)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {upload.totalDetections !== undefined ? upload.totalDetections : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(upload.id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Baixar original"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={() => handleReprocess(upload.id)}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                        title="Reprocessar"
                        disabled={upload.status === 'scanning'}
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(upload.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
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
                Página {currentPage} de {totalPages}
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

      {uploads.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhum upload encontrado
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filter === 'all' ? 'Você ainda não fez nenhum upload.' : 'Nenhum upload com este status.'}
          </p>
        </div>
      )}
    </div>
  );
};
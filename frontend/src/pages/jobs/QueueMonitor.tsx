import React, { useState, useEffect } from 'react';
import { Activity, Pause, Play, RotateCcw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface Job {
  id: string;
  type: 'Archive' | 'File';
  progress: number;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  data: any;
  createdAt: string;
  processedAt?: string;
  failedReason?: string;
}

interface QueueStats {
  archive: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  file: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export const QueueMonitor: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const { isConnected } = useWebSocket();

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchQueueData = async () => {
    try {
      const response = await fetch('/api/queue/status');
      const data = await response.json();
      
      setQueueStats(data.queues);
      
      // Simulated jobs data - in real implementation, fetch from BullMQ API
      const mockJobs: Job[] = [
        {
          id: 'job_001',
          type: 'Archive',
          progress: 75,
          status: 'active',
          data: { zipPath: '/uploads/customer_data.zip', originalName: 'customer_data.zip' },
          createdAt: '2025-06-24T01:00:00Z'
        },
        {
          id: 'job_002',
          type: 'File',
          progress: 100,
          status: 'completed',
          data: { filename: 'document1.txt', zipSource: 'customer_data.zip' },
          createdAt: '2025-06-24T00:55:00Z',
          processedAt: '2025-06-24T00:56:00Z'
        },
        {
          id: 'job_003',
          type: 'File',
          progress: 0,
          status: 'waiting',
          data: { filename: 'document2.txt', zipSource: 'customer_data.zip' },
          createdAt: '2025-06-24T01:01:00Z'
        },
        {
          id: 'job_004',
          type: 'Archive',
          progress: 25,
          status: 'failed',
          data: { zipPath: '/uploads/corrupted.zip', originalName: 'corrupted.zip' },
          createdAt: '2025-06-24T00:45:00Z',
          failedReason: 'Invalid ZIP file format'
        }
      ];
      
      setJobs(mockJobs);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching queue data:', error);
      setLoading(false);
    }
  };

  const handlePauseResume = async () => {
    try {
      // Implementation for pausing/resuming workers
      setIsPaused(!isPaused);
      console.log(isPaused ? 'Resuming workers' : 'Pausing workers');
    } catch (error) {
      console.error('Error toggling workers:', error);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      // Implementation for retrying failed jobs
      console.log('Retrying job:', jobId);
    } catch (error) {
      console.error('Error retrying job:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'active':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      waiting: 'Aguardando',
      active: 'Processando',
      completed: 'Concluído',
      failed: 'Falhou'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getProgressColor = (progress: number, status: string) => {
    if (status === 'failed') return 'bg-red-500';
    if (status === 'completed') return 'bg-green-500';
    if (progress > 75) return 'bg-blue-500';
    if (progress > 50) return 'bg-yellow-500';
    return 'bg-gray-300';
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
          Fila em Tempo Real
        </h1>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <button
            onClick={handlePauseResume}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isPaused 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
            {isPaused ? 'Retomar Workers' : 'Pausar Workers'}
          </button>
        </div>
      </div>

      {/* Queue Statistics */}
      {queueStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Fila de Arquivos (Archive)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{queueStats.archive.waiting}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Aguardando</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{queueStats.archive.active}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Ativo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{queueStats.archive.completed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Concluído</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{queueStats.archive.failed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Falhou</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Fila de Arquivos (File)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{queueStats.file.waiting}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Aguardando</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{queueStats.file.active}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Ativo</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{queueStats.file.completed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Concluído</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{queueStats.file.failed}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Falhou</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Stream */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Stream de Jobs
          </h3>
        </div>
        
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
                  Progresso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Criado
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
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(job.progress, job.status)}`}
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">
                        {job.progress}%
                      </span>
                    </div>
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
                      {job.type === 'Archive' ? job.data.originalName : job.data.filename}
                      {job.failedReason && (
                        <div className="text-xs text-red-600 mt-1">
                          {job.failedReason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatDate(job.createdAt)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetryJob(job.id)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Tentar novamente"
                      >
                        <RotateCcw size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {jobs.length === 0 && (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Nenhum job na fila
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Faça um upload para ver os jobs em tempo real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
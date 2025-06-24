import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Play, Settings, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface DirectorySource {
  id: string;
  name: string;
  path: string;
  type: 'one-shot' | 'daily' | 'realtime';
  status: 'active' | 'inactive' | 'error';
  lastScan: string;
  nextScan?: string;
  totalFiles: number;
  processSubdirs: boolean;
  filePatterns: string[];
  ignoredExtensions: string[];
  ignoredDirectories: string[];
}

export const DirectorySources: React.FC = () => {
  const [sources, setSources] = useState<DirectorySource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    path: '',
    type: 'one-shot' as 'one-shot' | 'daily' | 'realtime',
    processSubdirs: false,
    filePatterns: ['*.zip', '*.rar'],
    ignoredExtensions: ['.tmp', '.log'],
    ignoredDirectories: ['node_modules', '.git']
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      
      // Simulated data - in real implementation, fetch from API
      const mockSources: DirectorySource[] = [
        {
          id: 'src_001',
          name: 'Uploads Directory',
          path: '/uploads',
          type: 'realtime',
          status: 'active',
          lastScan: '2025-06-24T01:00:00Z',
          totalFiles: 156,
          processSubdirs: false,
          filePatterns: ['*.zip'],
          ignoredExtensions: ['.tmp', '.log'],
          ignoredDirectories: []
        },
        {
          id: 'src_002',
          name: 'Network Share Backup',
          path: '/mnt/backup/data',
          type: 'daily',
          status: 'active',
          lastScan: '2025-06-23T22:00:00Z',
          nextScan: '2025-06-24T22:00:00Z',
          totalFiles: 1247,
          processSubdirs: true,
          filePatterns: ['*.zip', '*.rar', '*.7z'],
          ignoredExtensions: ['.tmp', '.log', '.cache'],
          ignoredDirectories: ['temp', 'logs']
        },
        {
          id: 'src_003',
          name: 'FTP Documents',
          path: '/ftp/documents',
          type: 'one-shot',
          status: 'inactive',
          lastScan: '2025-06-20T15:30:00Z',
          totalFiles: 89,
          processSubdirs: false,
          filePatterns: ['*.zip'],
          ignoredExtensions: ['.tmp'],
          ignoredDirectories: []
        },
        {
          id: 'src_004',
          name: 'Archive Storage',
          path: '/archives/old-data',
          type: 'daily',
          status: 'error',
          lastScan: '2025-06-22T10:00:00Z',
          totalFiles: 0,
          processSubdirs: true,
          filePatterns: ['*.*'],
          ignoredExtensions: [],
          ignoredDirectories: []
        }
      ];

      setSources(mockSources);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sources:', error);
      setLoading(false);
    }
  };

  const handleAddSource = async () => {
    try {
      // In real implementation, call API to create source
      const newSourceData: DirectorySource = {
        id: `src_${Date.now()}`,
        ...newSource,
        status: 'inactive',
        lastScan: new Date().toISOString(),
        totalFiles: 0
      };

      setSources([...sources, newSourceData]);
      setShowAddModal(false);
      setNewSource({
        name: '',
        path: '',
        type: 'one-shot',
        processSubdirs: false,
        filePatterns: ['*.zip', '*.rar'],
        ignoredExtensions: ['.tmp', '.log'],
        ignoredDirectories: ['node_modules', '.git']
      });
    } catch (error) {
      console.error('Error adding source:', error);
    }
  };

  const handleManualScan = async (sourceId: string) => {
    try {
      // In real implementation, trigger manual scan
      setSources(sources.map(source => 
        source.id === sourceId 
          ? { ...source, lastScan: new Date().toISOString(), status: 'active' }
          : source
      ));
    } catch (error) {
      console.error('Error triggering manual scan:', error);
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (window.confirm('Tem certeza que deseja remover esta fonte?')) {
      setSources(sources.filter(source => source.id !== sourceId));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      active: 'Ativo',
      inactive: 'Inativo',
      error: 'Erro'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      'one-shot': 'Execução única',
      daily: 'Diário',
      realtime: 'Tempo real'
    };
    return labels[type as keyof typeof labels] || type;
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
          Fontes de Diretório
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Adicionar Fonte
        </button>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sources.map((source) => (
          <div key={source.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {source.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {source.path}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(source.status)}
                  <span className="text-sm text-gray-900 dark:text-white">
                    {getStatusLabel(source.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tipo</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {getTypeLabel(source.type)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Arquivos</div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {source.totalFiles.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Padrões de arquivo</div>
                  <div className="flex flex-wrap gap-1">
                    {source.filePatterns.map((pattern, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>

                {source.ignoredExtensions.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Extensões ignoradas</div>
                    <div className="flex flex-wrap gap-1">
                      {source.ignoredExtensions.map((ext, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {ext}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  Última varredura: {formatDate(source.lastScan)}
                </div>
                {source.nextScan && (
                  <div>
                    Próxima varredura: {formatDate(source.nextScan)}
                  </div>
                )}
                <div>
                  Subdiretórios: {source.processSubdirs ? 'Sim' : 'Não'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleManualScan(source.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Play size={14} />
                  Scan Manual
                </button>
                <button
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  <Settings size={14} />
                  Configurar
                </button>
                <button
                  onClick={() => handleDeleteSource(source.id)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={14} />
                  Remover
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Source Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Adicionar Nova Fonte
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={newSource.name}
                    onChange={(e) => setNewSource(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Nome da fonte"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Caminho
                  </label>
                  <input
                    type="text"
                    value={newSource.path}
                    onChange={(e) => setNewSource(prev => ({ ...prev, path: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="/caminho/para/diretorio"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tipo de Agendamento
                </label>
                <select
                  value={newSource.type}
                  onChange={(e) => setNewSource(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="one-shot">Execução única</option>
                  <option value="daily">Diário</option>
                  <option value="realtime">Tempo real (inotify)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newSource.processSubdirs}
                    onChange={(e) => setNewSource(prev => ({ ...prev, processSubdirs: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Processar subdiretórios
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Padrões de Arquivo (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={newSource.filePatterns.join(', ')}
                  onChange={(e) => setNewSource(prev => ({ 
                    ...prev, 
                    filePatterns: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="*.zip, *.rar, *.7z"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Extensões Ignoradas
                  </label>
                  <input
                    type="text"
                    value={newSource.ignoredExtensions.join(', ')}
                    onChange={(e) => setNewSource(prev => ({ 
                      ...prev, 
                      ignoredExtensions: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder=".tmp, .log, .cache"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Diretórios Ignorados
                  </label>
                  <input
                    type="text"
                    value={newSource.ignoredDirectories.join(', ')}
                    onChange={(e) => setNewSource(prev => ({ 
                      ...prev, 
                      ignoredDirectories: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="node_modules, .git, temp"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddSource}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Adicionar Fonte
              </button>
            </div>
          </div>
        </div>
      )}

      {sources.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Nenhuma fonte configurada
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Adicione diretórios para monitoramento automático de arquivos.
          </p>
        </div>
      )}
    </div>
  );
};
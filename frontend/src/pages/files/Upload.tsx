import React, { useState, useRef } from 'react';
import { Upload as UploadIcon, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';

interface UploadProgress {
  sessionId: string;
  stage: string;
  progress: number;
  message: string;
  details?: any;
}

export const Upload: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { joinSession, onProgress, offProgress } = useWebSocket();

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => 
      file.type === 'application/zip' || 
      file.name.toLowerCase().endsWith('.zip')
    );
    
    if (zipFile) {
      setSelectedFile(zipFile);
      setError(null);
    } else {
      setError('Por favor, selecione apenas arquivos ZIP');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'application/zip' || file.name.toLowerCase().endsWith('.zip')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Por favor, selecione apenas arquivos ZIP');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadResult(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/v1/archives/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro no upload');
      }

      // Join WebSocket session for progress updates
      if (result.sessionId) {
        joinSession(result.sessionId);
        
        const progressHandler = (update: UploadProgress) => {
          setUploadProgress(update);
          
          if (update.stage === 'complete') {
            setUploadResult(result);
            setIsUploading(false);
            offProgress(progressHandler);
          } else if (update.stage === 'error') {
            setError(update.message);
            setIsUploading(false);
            offProgress(progressHandler);
          }
        };

        onProgress(progressHandler);
      } else {
        setUploadResult(result);
        setIsUploading(false);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload');
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(null);
    setUploadResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStageLabel = (stage: string) => {
    const stages = {
      upload: 'Upload concluído',
      virus_scan: 'Verificação de vírus',
      extraction: 'Extraindo arquivos',
      processing: 'Processando PII',
      complete: 'Processamento concluído',
      error: 'Erro'
    };
    return stages[stage as keyof typeof stages] || stage;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Enviar Arquivo
        </h1>
      </div>

      {/* Upload Area */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <UploadIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Arraste um arquivo ZIP aqui
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              ou clique para selecionar um arquivo
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isUploading}
            >
              Selecionar ZIP
            </button>
          </div>

          {/* Selected File */}
          {selectedFile && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={resetUpload}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                  disabled={isUploading}
                >
                  <X size={16} />
                </button>
              </div>

              {!isUploading && !uploadResult && (
                <button
                  onClick={handleUpload}
                  className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Iniciar Upload e Processamento
                </button>
              )}
            </div>
          )}

          {/* Progress */}
          {uploadProgress && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {getStageLabel(uploadProgress.stage)}
                </span>
              </div>
              
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.progress}%` }}
                ></div>
              </div>
              
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                {uploadProgress.message}
              </p>
              
              {uploadProgress.details && (
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  {uploadProgress.details.filesProcessed && (
                    <p>Arquivos processados: {uploadProgress.details.filesProcessed}/{uploadProgress.details.totalFiles}</p>
                  )}
                  {uploadProgress.details.detectionsFound !== undefined && (
                    <p>PII detectadas: {uploadProgress.details.detectionsFound}</p>
                  )}
                  {uploadProgress.details.currentFile && (
                    <p>Arquivo atual: {uploadProgress.details.currentFile}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Success Result */}
          {uploadResult && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900 dark:text-green-100">
                  Upload processado com sucesso!
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Arquivos processados:</span>
                  <span className="ml-2 font-medium">{uploadResult.results?.totalFiles || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">PII detectadas:</span>
                  <span className="ml-2 font-medium">{uploadResult.results?.totalDetections || 0}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Sessão:</span>
                  <span className="ml-2 font-mono text-xs">{uploadResult.sessionId}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Scanner:</span>
                  <span className="ml-2 font-medium">{uploadResult.results?.scanResult?.scanner || 'N/A'}</span>
                </div>
              </div>
              
              <button
                onClick={resetUpload}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Novo Upload
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="font-medium text-red-900 dark:text-red-100">
                  Erro no processamento
                </span>
              </div>
              <p className="text-sm text-red-800 dark:text-red-200 mt-2">
                {error}
              </p>
              <button
                onClick={resetUpload}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
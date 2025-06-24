import React, { useState, useCallback } from 'react';
import { Upload, X, FileIcon, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export const FileUpload: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: UploadedFile[] = Array.from(fileList)
      .filter(file => file.name.endsWith('.zip'))
      .map(file => ({
        id: Math.random().toString(36).substring(7),
        name: file.name,
        size: file.size,
        status: 'pending' as const,
        progress: 0
      }));

    if (newFiles.length === 0) {
      alert('Por favor, selecione apenas arquivos ZIP.');
      return;
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Simulate upload process
    newFiles.forEach(file => {
      simulateUpload(file.id);
    });
  }, []);

  const simulateUpload = async (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: 'uploading' as const } : f
    ));

    // Simulate progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress } : f
      ));
    }

    // Simulate completion
    const success = Math.random() > 0.2; // 80% success rate
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { 
        ...f, 
        status: success ? 'success' as const : 'error' as const,
        error: success ? undefined : 'Erro durante o processamento do arquivo'
      } : f
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileIcon className="w-5 h-5 text-foreground-muted" />;
      case 'uploading':
        return <Loader className="w-5 h-5 text-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error" />;
    }
  };

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="default">Pendente</Badge>;
      case 'uploading':
        return <Badge variant="info">Carregando</Badge>;
      case 'success':
        return <Badge variant="success">Concluído</Badge>;
      case 'error':
        return <Badge variant="error">Erro</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Upload de Arquivos
        </h1>
        <p className="text-foreground-muted">
          Carregue arquivos ZIP para análise de dados pessoais (PII) e conformidade LGPD
        </p>
      </div>

      {/* Upload Area */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Carregar Arquivos ZIP</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200
              ${isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-background-muted'
              }
            `}
            style={{
              borderColor: isDragging ? 'var(--primary)' : 'var(--border)',
              backgroundColor: isDragging ? 'rgba(0, 173, 224, 0.05)' : 'transparent'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload 
              className="w-16 h-16 mx-auto mb-4 text-foreground-muted" 
              style={{ color: isDragging ? 'var(--primary)' : 'var(--foreground-muted)' }}
            />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Arraste arquivos ZIP aqui
            </h3>
            <p className="text-foreground-muted mb-6">
              Ou clique para selecionar arquivos do seu computador
            </p>
            
            <input
              type="file"
              multiple
              accept=".zip"
              onChange={handleFileInput}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="primary" size="lg">
                Selecionar Arquivos
              </Button>
            </label>
            
            <div className="mt-6 text-sm text-foreground-subtle">
              <p>• Apenas arquivos ZIP são aceitos</p>
              <p>• Tamanho máximo: 100MB por arquivo</p>
              <p>• Múltiplos arquivos podem ser carregados simultaneamente</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Arquivos Carregados ({files.length})</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFiles([])}
            >
              Limpar Lista
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 rounded-lg border border-border bg-background-elevated"
                  style={{
                    backgroundColor: 'var(--background-elevated)',
                    borderColor: 'var(--border)'
                  }}
                >
                  {getStatusIcon(file.status)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {file.name}
                      </h4>
                      {getStatusBadge(file.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-foreground-muted">
                      <span>{formatFileSize(file.size)}</span>
                      {file.status === 'uploading' && (
                        <span>{file.progress}%</span>
                      )}
                      {file.error && (
                        <span className="text-error">{file.error}</span>
                      )}
                    </div>
                    
                    {file.status === 'uploading' && (
                      <div className="mt-2">
                        <div className="w-full bg-background-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${file.progress}%`,
                              backgroundColor: 'var(--primary)'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    icon={X}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instruções de Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-foreground mb-3">Preparação dos Arquivos</h4>
              <ul className="space-y-2 text-sm text-foreground-muted">
                <li>• Comprima os arquivos em formato ZIP</li>
                <li>• Certifique-se de que os arquivos contêm dados estruturados</li>
                <li>• Remova arquivos desnecessários para reduzir o tamanho</li>
                <li>• Organize os dados por categorias quando possível</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Processo de Análise</h4>
              <ul className="space-y-2 text-sm text-foreground-muted">
                <li>• O sistema detecta automaticamente dados pessoais</li>
                <li>• Classificação segundo a LGPD é aplicada</li>
                <li>• Relatórios de conformidade são gerados</li>
                <li>• Notificações são enviadas quando concluído</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
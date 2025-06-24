import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Shield, Calendar, User, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

interface Detection {
  id: string;
  titular: string;
  documento: 'CPF' | 'CNPJ' | 'Email' | 'Telefone' | 'RG' | 'CEP' | 'Nome Completo';
  valor: string;
  arquivo: string;
  timestamp: string;
  zipSource: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  contextualInfo?: string;
}

export const Detections: React.FC = () => {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchDetections();
  }, []);

  const fetchDetections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/reports/detections');
      if (response.ok) {
        const data = await response.json();
        setDetections(data.detections || []);
      }
    } catch (error) {
      console.error('Error fetching detections:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDetections = detections.filter(detection => {
    const matchesSearch = detection.titular.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         detection.valor.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         detection.arquivo.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'all' || detection.documento === selectedType;
    const matchesRisk = selectedRisk === 'all' || detection.riskLevel === selectedRisk;
    
    return matchesSearch && matchesType && matchesRisk;
  });

  const paginatedDetections = filteredDetections.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredDetections.length / itemsPerPage);

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'CPF':
      case 'RG':
        return <User className="w-4 h-4" />;
      case 'Email':
        return <FileText className="w-4 h-4" />;
      case 'Telefone':
        return <Shield className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'critical': return 'error' as const;
      case 'high': return 'warning' as const;
      case 'medium': return 'info' as const;
      case 'low': return 'success' as const;
      default: return 'default' as const;
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'critical': return 'Crítico';
      case 'high': return 'Alto';
      case 'medium': return 'Médio';
      case 'low': return 'Baixo';
      default: return 'Desconhecido';
    }
  };

  const documentTypes = ['CPF', 'CNPJ', 'Email', 'Telefone', 'RG', 'CEP', 'Nome Completo'];
  const riskLevels = ['low', 'medium', 'high', 'critical'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Detecções de PII
          </h1>
          <p className="text-foreground-muted">
            Dados pessoais detectados nos arquivos processados pelo n.crisis
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={Download}>
            Exportar CSV
          </Button>
          <Button variant="primary" icon={Shield}>
            Análise Detalhada
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {detections.length.toLocaleString()}
                </div>
                <div className="text-sm text-foreground-muted">
                  Total de Detecções
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-error/10">
                <User className="w-6 h-6 text-error" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {detections.filter(d => d.riskLevel === 'critical' || d.riskLevel === 'high').length}
                </div>
                <div className="text-sm text-foreground-muted">
                  Alto Risco
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-warning/10">
                <FileText className="w-6 h-6 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {new Set(detections.map(d => d.arquivo)).size}
                </div>
                <div className="text-sm text-foreground-muted">
                  Arquivos Afetados
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-info/10">
                <Calendar className="w-6 h-6 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {new Set(detections.map(d => d.titular)).size}
                </div>
                <div className="text-sm text-foreground-muted">
                  Titulares Únicos
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por titular, valor ou arquivo..."
                value={searchQuery}
                onChange={setSearchQuery}
                icon={Search}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              >
                <option value="all">Todos os Tipos</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                style={{
                  backgroundColor: 'var(--background)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              >
                <option value="all">Todos os Riscos</option>
                {riskLevels.map(risk => (
                  <option key={risk} value={risk}>{getRiskLabel(risk)}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>
            Resultados ({filteredDetections.length} de {detections.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-foreground-muted">Carregando detecções...</p>
            </div>
          ) : paginatedDetections.length === 0 ? (
            <div className="p-12 text-center">
              <Shield className="w-12 h-12 text-foreground-muted mx-auto mb-4" />
              <p className="text-foreground-muted">Nenhuma detecção encontrada</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {paginatedDetections.map((detection) => (
                <div key={detection.id} className="p-6 hover:bg-background-muted transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 rounded-lg bg-background-elevated border border-border">
                        {getDocumentIcon(detection.documento)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">
                            {detection.titular}
                          </h3>
                          <Badge variant={getRiskBadgeVariant(detection.riskLevel)}>
                            {getRiskLabel(detection.riskLevel)}
                          </Badge>
                          <Badge variant="outline">
                            {detection.documento}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-sm text-foreground-muted">
                          <p><strong>Valor:</strong> {detection.valor}</p>
                          <p><strong>Arquivo:</strong> {detection.arquivo}</p>
                          <p><strong>Fonte ZIP:</strong> {detection.zipSource}</p>
                          <p><strong>Detectado em:</strong> {new Date(detection.timestamp).toLocaleString('pt-BR')}</p>
                          {detection.contextualInfo && (
                            <p><strong>Contexto:</strong> {detection.contextualInfo}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="sm" icon={Eye}>
                      Detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground-muted">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredDetections.length)} de {filteredDetections.length} resultados
          </p>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Anterior
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
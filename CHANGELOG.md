# Changelog

Todas as mudanças notáveis do projeto N.Crisis serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2025-06-24

### Adicionado
- Sistema completo de detecção de PII com foco brasileiro
- Interface React moderna com design system consistente
- 10 padrões regex pré-configurados (CPF, CNPJ, RG, Email, Telefone, CEP, Nome Próprio, Cartão, PIS/PASEP, Título Eleitor)
- Sistema de regex patterns personalizados com CRUD completo
- Validação algorítmica para CPF e CNPJ brasileiros
- Detecção específica de nomes próprios brasileiros
- Sistema de upload de arquivos com suporte a ZIP
- Análise de arquivos ZIP locais existentes
- Análise recursiva de pastas locais e compartilhadas
- Sistema de gestão de incidentes LGPD
- Dashboard com estatísticas em tempo real
- Relatórios completos (Consolidado, Titulares, Organizações, Incidentes)
- Export de relatórios em CSV e PDF
- Sistema de configurações avançadas
- Escaneamento de vírus com ClamAV
- Proteção contra zip bombs e path traversal
- WebSocket para atualizações em tempo real
- Sistema de organizações e usuários
- Mapeamento automático de artigos LGPD
- Containerização completa com Docker
- Scripts automatizados de deploy
- Banco PostgreSQL com schema otimizado
- Cache Redis para performance
- Health checks e monitoramento
- Logs estruturados com rotação
- Documentação completa
- Testes unitários e de integração

### Detalhes Técnicos

#### Backend
- Node.js 20 com TypeScript
- Express.js com middleware de segurança
- Prisma ORM para PostgreSQL
- Socket.IO para real-time updates
- Multer para upload de arquivos
- Express-validator para validação
- Helmet para headers de segurança
- CORS configurável por ambiente
- Compression gzip automática
- Pino para logs estruturados

#### Frontend
- React 18 com TypeScript
- Vite para build otimizado
- React Router para navegação SPA
- React Hook Form para formulários
- Axios para comunicação HTTP
- Socket.IO client para WebSocket
- jsPDF e html2canvas para exports
- Design system com CSS variables
- Componentes reutilizáveis
- Responsive design mobile-first

#### DevOps
- Docker multi-stage builds
- Docker Compose para orquestração
- PostgreSQL 15 com otimizações
- Redis 7 para cache
- Nginx como reverse proxy
- Let's Encrypt para SSL
- Health checks automatizados
- Restart policies configuradas
- Volumes persistentes
- Logs centralizados

#### Segurança
- Validação rigorosa de entrada
- Sanitização de outputs
- Proteção CSRF
- Headers de segurança
- Escaneamento antivírus
- Limite de tamanho de arquivos
- Validação de tipos MIME
- Isolamento de containers
- Usuários não-root
- Secrets management

### Estrutura do Projeto
```
ncrisis/
├── src/                    # Backend TypeScript
├── frontend/               # Frontend React
├── uploads/               # Arquivos via upload
├── local_files/          # ZIPs locais
├── shared_folders/       # Pastas compartilhadas
├── docker-compose.yml    # Orquestração
├── Dockerfile           # Container build
├── deploy.sh           # Script de deploy
├── init.sql           # Schema do banco
└── docs/             # Documentação
```

### Performance
- Build otimizado com tree-shaking
- Lazy loading de componentes
- Memoização de componentes pesados
- Índices otimizados no banco
- Cache Redis para queries frequentes
- Compressão gzip para responses
- Otimização de imagens
- Bundle splitting automático

### Compliance LGPD
- Detecção específica para dados brasileiros
- Mapeamento automático de artigos
- Classificação de riscos
- Relatórios para DPO
- Auditoria completa
- Gestão de consentimentos
- Anonimização de dados
- Direito ao esquecimento

### Monitoramento
- Health checks em todos os serviços
- Métricas de performance
- Logs estruturados com correlação
- Alertas configuráveis
- Dashboard de monitoramento
- Backup automatizado
- Rotação de logs
- Cleanup de arquivos temporários

## [Unreleased]

### Planejado
- Integração com APIs de terceiros
- Machine Learning para detecção avançada
- Sistema de notificações
- Dashboard administrativo
- API GraphQL
- Testes end-to-end
- CI/CD pipeline
- Kubernetes deployment
- Elasticsearch para logs
- Prometheus/Grafana monitoring
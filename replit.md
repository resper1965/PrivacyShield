# n.crisis - PII Detection & LGPD Compliance Platform

**Repositório**: https://github.com/resper1965/PrivacyShield  
**Domínio**: monster.e-ness.com.br

## Overview

This is a Node.js/Express application built with TypeScript for detecting personally identifiable information (PII) in ZIP files. The system is branded as "n.crisis" with Montserrat typography and uses a distinctive blue dot (#00ade0) in the logo. The system processes uploaded ZIP files asynchronously using BullMQ queues, validates them using MIME type checking and ClamAV virus scanning, extracts contents securely, and detects CPF, CNPJ, Email, and Phone patterns with Brazilian validation algorithms. Data is persisted in PostgreSQL database using Prisma ORM. The server provides RESTful API endpoints for file upload, queue monitoring, and filtered reporting by data subjects.

## System Architecture

### Backend Architecture
- **Framework**: Express.js with TypeScript and comprehensive PII detection
- **Runtime**: Node.js 20 with WebSocket support for real-time progress tracking
- **Language**: TypeScript with Brazilian PII pattern validation algorithms
- **Entry Point**: `src/server-simple.ts` with integrated processing pipeline
- **Processing**: Secure ZIP extraction with ClamAV scanning and context analysis

### Core Features
- **PII Detection**: 7 Brazilian data types with validation (CPF, CNPJ, RG, CEP, Email, Telefone, Nome Completo)
- **Security**: Zip-bomb protection, virus scanning, path traversal prevention
- **Real-time**: WebSocket progress updates during upload and processing
- **Reporting**: LGPD compliance reports with domain/CNPJ filtering and CSV export
- **Database**: PostgreSQL with Prisma ORM, context and position tracking

### Security Layer
- **Helmet**: Security headers and CSP configuration
- **CORS**: Cross-origin resource sharing with configurable origins
- **Compression**: Gzip compression for responses

### Code Quality Tools
- **ESLint**: Comprehensive linting with TypeScript support
- **Prettier**: Code formatting with consistent style
- **TypeScript**: Strict compilation settings for type safety

## Key Components

### Server Infrastructure
- **Main Server Class**: `PrivacyDetectiveServer` in `src/server.ts`
  - Configurable host and port settings
  - Middleware stack setup
  - Route configuration (to be implemented)
  - Centralized error handling

### Type System
- **Centralized Types**: `src/types/index.ts`
  - Server configuration interfaces
  - Standardized API response structures
  - Error handling types
  - Environment variable definitions

### Development Configuration
- **Build System**: TypeScript compiler with source maps and declarations
- **Output Directory**: `./build` for compiled JavaScript
- **Source Directory**: `./src` for TypeScript source files

## Data Flow

Currently, the application is in initial setup phase with the following planned flow:
1. HTTP requests received by Express server
2. Security middleware processing (Helmet, CORS)
3. Request compression and parsing
4. Route handling (to be implemented)
5. Standardized API responses using defined types
6. Error handling with structured error responses

## External Dependencies

### Core Dependencies
- **express**: Web framework for Node.js
- **cors**: CORS middleware
- **helmet**: Security middleware
- **compression**: Response compression
- **ts-node**: TypeScript execution for Node.js
- **typescript**: TypeScript compiler
- **nodemon**: Development server with auto-restart
- **concurrently**: Running multiple processes

### Development Dependencies
- **ESLint ecosystem**: Code linting and analysis
- **Prettier**: Code formatting
- **TypeScript types**: Type definitions for all dependencies

## Deployment Strategy

### Environment Configuration
- Environment-based CORS origins configuration
- Configurable server host and port
- Support for environment variables through process.env

### Build Process
- TypeScript compilation to JavaScript
- Source map generation for debugging
- Declaration file generation for type checking

### Replit Integration
- Configured for Node.js 20 runtime
- Automatic dependency installation workflow
- Development server setup

## User Preferences

Preferred communication style: Simple, everyday language.
Brand identity: "n.crisis" with Montserrat font, white/black text with blue dot (#00ade0).
User prefers simple, direct layouts without overcomplication. Focus on functionality over complex design systems.
Installation directory: `/opt/ncrisis` - standardized across all scripts and documentation.
Production deployment: All documentation and scripts updated for v2.1 with AI capabilities (OpenAI, FAISS, semantic chat).
VPS deployment: monster.e-ness.com.br domain with complete automated installation script.

## Instalação Limpa

### Diretórios de Instalação
- **Execução**: `/root` (execute os scripts daqui)
- **N.Crisis**: `/opt/ncrisis` (aplicação principal)
- **N8N**: `/opt/n8n` (automação opcional)
- **Logs**: `/var/log/ncrisis-install.log`

### Scripts Consolidados
- `install-fix.sh` - Script principal corrigido (funciona para público/privado)
- `install-simples.sh` - Versão ultra simples como fallback
- `README_INSTALACAO.md` - Documentação única completa

### Múltiplas Instâncias
Sistema preparado para conviver com N8N e outros serviços no mesmo servidor, cada um em seu diretório `/opt/` isolado.

## Changelog

Recent Updates:
- June 25, 2025: **VPS Deployment Successful** - N.Crisis successfully deployed on monster.e-ness.com.br with complete Docker containerization, PostgreSQL database, Redis cache, and Nginx reverse proxy. Application running healthy on port 5000 with external HTTP access confirmed. SSL configuration ready for HTTPS setup.
- June 25, 2025: **Port Conflict Resolution** - Resolved Nginx port configuration issue where proxy was attempting to connect to port 8000 instead of 5000. Fixed with clean Nginx configuration and container restart. All services now operational.
- June 25, 2025: **Instalação VPS Simplificada** - Criado install-vps-simples.sh com instalação completamente automatizada em comando único. Script de 200+ linhas instala todo o ambiente (Node.js, PostgreSQL, Redis, ClamAV, Nginx, SSL) e compila aplicação sem interação manual. Tempo: 15-20 minutos para VPS completa
- June 25, 2025: **Dockerfile Robusto Corrigido** - Substituído Dockerfile multi-stage complexo por versão single-stage robusta que resolve npm ci sem package-lock.json, usa npm install com fallbacks, constrói frontend condicionalmente, múltiplos caminhos de start (build/ts-node/npm), porta 5000 corrigida
- June 25, 2025: **Script Final install-simples.sh** - Criado script definitivo que resolve conflitos Node.js/npm removendo pacotes conflitantes, usando NodeSource para Node.js 20, Dockerfile com múltiplos fallbacks (build/ts-node/npm start), validação robusta e sintaxe bash limpa testada localmente
- June 25, 2025: **Limpeza e Consolidação Completa** - Removidos 30+ arquivos desnecessários de instalação, criados 2 scripts robustos (público/privado), documentação unificada em arquivo único, suporte para múltiplas instâncias N8N, diretórios claramente definidos (/root execução, /opt/ncrisis aplicação)
- June 25, 2025: **Instalação VPS Simplificada** - Criado install-vps-simples.sh com instalação completamente automatizada em comando único. Script de 200+ linhas instala todo o ambiente (Node.js, PostgreSQL, Redis, ClamAV, Nginx, SSL) e compila aplicação sem interação manual. Tempo: 15-20 minutos para VPS completa
- June 25, 2025: **Token GitHub Fix** - Corrigido problema de reconhecimento do GITHUB_PERSONAL_ACCESS_TOKEN no install-ncrisis.sh. Script agora carrega variáveis de ambiente persistentes e permite execução com sudo -E. Comando direto criado: `GITHUB_PERSONAL_ACCESS_TOKEN="token" sudo -E ./install-ncrisis.sh`
- June 25, 2025: **APT Sources Fixed** - Corrigido problema definitivo de repositórios APT duplicados no VPS Ubuntu com script fix-apt-sources.sh e integração automática no install-ncrisis.sh. Comando one-liner criado para correção imediata dos warnings "Target ... is configured multiple times"
- June 25, 2025: **Documentation Unified** - Consolidada toda documentação VPS em arquivos únicos: INSTALACAO_VPS_COMPLETA.md (guia detalhado) e COMANDO_INSTALACAO_VPS.md (comando one-liner). Removidos arquivos duplicados, mantido apenas install-ncrisis.sh como script principal
- June 25, 2025: **Unified Installation Script Complete** - Criado script unificado install-ncrisis.sh com 1000+ linhas, tratamento robusto de erros, suporte a múltiplas distribuições Linux (Ubuntu/CentOS/RHEL), modo atualização integrado, testes abrangentes, monitoramento automatizado, backup automático e configuração completa de produção
- June 25, 2025: **VPS Installation Documentation Complete** - Criada documentação completa de instalação VPS v2.1 com guias detalhados, script automatizado de produção, configurações avançadas de segurança, monitoramento e troubleshooting. Inclui instalação rápida e guia completo para Ubuntu 22.04 com todas as funcionalidades AI
- June 25, 2025: **Frontend AI Integration Complete** - Implementadas todas as funcionalidades AI no frontend: página Search com interface ChatGPT, análise IA nos arquivos com score de risco, dashboard com indicadores AI, configurações completas de IA com estatísticas em tempo real. Sistema frontend+backend totalmente integrado
- June 25, 2025: **Production Ready v2.1** - Sistema completo validado para produção com documentação atualizada, scripts de instalação v2.1, guias de deploy, checklist completo e validação automatizada. Todas as funcionalidades AI testadas e operacionais
- June 25, 2025: **Semantic Chat API** - Criado endpoint POST /api/v1/chat que combina busca semântica FAISS com OpenAI GPT-3.5-turbo. Gera embedding da query, busca contextos relevantes e responde baseado nos documentos encontrados
- June 25, 2025: **FAISS Vector Search** - Implementado FaissManager singleton com IndexFlatL2, métodos init(), upsert(fileId, vector) e search(vector, k). Carrega embeddings do Prisma automaticamente e permite busca semântica
- June 25, 2025: **OpenAI Embeddings API** - Criado endpoint POST /api/v1/embeddings que gera vetores OpenAI e persiste em modelo TextEmbedding com cache por hash de texto. Inclui endpoints GET by ID e health check
- June 25, 2025: **N8N Workflow Integration** - Implementado serviço n8nService.ts que dispara webhooks automaticamente após processamento de arquivos. Worker ArchiveScan agora invoca triggerN8nIncident(fileId) após scan limpo e metadata persistida, com logs de auditoria e fallback resiliente
- June 25, 2025: **N8N Webhook Integration** - Criado endpoint POST /api/v1/n8n/webhook/incident para receber webhooks de registro de incidentes do n8n, com validação de fileId e logs de auditoria
- June 24, 2025: **Unified Installation Script** - Criado install-and-start.sh que agrega toda a funcionalidade de instalação, configuração e inicialização em um script único funcional. Remove dependência do Docker e configura PostgreSQL, Node.js, firewall e systemd automaticamente
- June 24, 2025: **VPS Installation Complete** - Script install-vps-complete.sh executado pelo usuário, criado guia de próximos passos para verificação e configuração final do sistema no servidor monster.e-ness.com.br
- June 24, 2025: **VPS Installation Fix** - Corrigido erro de diretório existente no install-vps-complete.sh, adicionado verificação e opções para resolver conflitos de diretório /opt/ncrisis
- June 24, 2025: **Download URLs Update** - Atualizados todos os comandos de download para usar URLs corretas do GitHub raw.githubusercontent.com com autenticação via GITHUB_PERSONAL_ACCESS_TOKEN, criado guia específico de download
- June 24, 2025: **Repository References Update** - Atualizados todos os documentos e referências para o repositório correto https://github.com/resper1965/PrivacyShield em todos os arquivos de documentação e scripts de instalação
- June 24, 2025: **Environment Configuration Update** - Criado arquivo .env.example atualizado com todas as variáveis necessárias do N.Crisis, incluindo configurações de PostgreSQL, Redis, OpenAI, ClamAV, SendGrid e CORS com exemplos realistas mas fictícios
- June 24, 2025: **Processo Completo de Instalação VPS** - Criado processo robusto de instalação em VPS Linux com Docker para o domínio monster.e-ness.com.br, incluindo scripts automatizados de instalação, configuração SSL, backup, monitoramento, health check e documentação completa passo a passo. Scripts organizados no diretório /scripts/ do repositório GitHub privado com autenticação por token GITHUB_PERSONAL_ACCESS_TOKEN
- June 24, 2025: **Deploy Production Ready** - Aplicação preparada para homologação com Docker containerization, WebSocket errors resolvidos, scripts de deploy automatizados, banco PostgreSQL inicializado, health checks implementados e documentação completa
- June 24, 2025: **Sistema de Análise de Pastas Locais** - Implementada funcionalidade completa para análise de pastas locais e compartilhadas com suporte a caminhos personalizados, seleção de pastas disponíveis, progress tracking e resultados detalhados de detecção PII
- June 24, 2025: **Sistema de Análise e Relatórios LGPD** - Criado sistema completo de relatórios com 4 abas (Consolidado, Titulares, Organizações, Incidentes), export CSV/PDF, tela de análise de detecções, e configurações funcionais
- June 24, 2025: **Menu Update** - Alterado "Casos" para "Incidentes" e "Processamento" para "Análise" no menu lateral
- June 24, 2025: **AppLayout Restructure** - Menu lateral simplificado:
  - Sidebar 240px fixa com bg #112240
  - 5 itens principais: Dashboard, Casos, Arquivos, Relatório, Configuração
  - Header 64px com título dinâmico e avatar
  - Hover sublinha cyan #00ade0
- June 24, 2025: **Complete UI/UX Redesign** - Modern n.crisis interface:
  - Rebuilt design system with comprehensive CSS variables and semantic tokens
  - Created reusable UI component library (Card, Button, Input, Badge, etc.)
  - Redesigned Layout with modern Sidebar and Header components
  - Completely rebuilt Dashboard with modern cards, stats, and activity feed
  - New FileUpload page with drag-and-drop functionality and progress tracking
  - Enhanced Detections page with advanced filtering and pagination
  - Responsive design with mobile-first approach and accessibility compliance
  - Professional dark theme optimized for security operations
- June 24, 2025: **Production Docker Deployment Configuration** - Complete containerization setup:
  - Multi-stage Dockerfiles for backend API and frontend with security best practices
  - Docker Compose orchestration with Traefik reverse proxy and Let's Encrypt SSL
  - Production-ready PostgreSQL, Redis, and ClamAV services with health checks
  - Background worker service for asynchronous file processing
  - Nginx configuration with security headers, compression, and API proxying
  - Database initialization scripts with performance tuning and audit logging
  - Environment configuration templates for secure production deployment
  - Complete installation script for Ubuntu 22.04 VPS deployment

- June 24, 2025: **Cybersecurity Incident Management System** - Implemented comprehensive incident tracking:
  - Complete incident lifecycle management with LGPD compliance analysis
  - React frontend with dark theme (#0D1B2A, #00ade0 accents) and modern UX/UI
  - Organization and user management with search-as-you-type functionality
  - Incident creation form with real-time validation and file attachment support
  - LGPD analysis modal with article mapping, data categorization, and risk assessment
  - WebSocket integration for real-time progress tracking during file uploads
  - Comprehensive dashboard with statistics cards and incident overview
  - Database schema with Organization, User, and Incident models
  - RESTful API endpoints with express-validator for data validation
  - Responsive design with mobile-first approach and accessibility compliance

Previous Features:
- June 23, 2025: Initial TypeScript project scaffold and complete PII detection system
- June 23, 2025: ClamAV virus scanning with MIME validation and secure ZIP processing
- June 24, 2025: Enhanced PII detection with Brazilian validation algorithms
- June 24, 2025: PostgreSQL migration with Prisma ORM and database persistence
- June 24, 2025: BullMQ queue system with Redis backend and asynchronous processing

## Notes for Development

The application is currently in foundation stage with:
- Server infrastructure established
- Security middleware configured
- Type system foundation in place
- Development tooling configured
- Route handlers and business logic pending implementation

The architecture supports future expansion for privacy detection features while maintaining type safety and code quality standards.
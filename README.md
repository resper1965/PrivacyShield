# N.Crisis - PII Detection & LGPD Compliance Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

## Overview

N.Crisis é uma plataforma avançada de detecção de dados pessoais (PII) e conformidade LGPD, construída com tecnologias modernas para oferecer análise em tempo real, busca semântica com IA e relatórios completos de conformidade.

### Principais Recursos

- **Detecção PII Avançada**: 7 tipos de dados brasileiros (CPF, CNPJ, RG, CEP, Email, Telefone, Nome)
- **IA Integrada**: OpenAI GPT-4o para análise contextual e FAISS para busca semântica
- **Interface Moderna**: Dashboard React com WebSocket para atualizações em tempo real
- **Processamento Assíncrono**: BullMQ com Redis para processamento de arquivos ZIP
- **Segurança Robusta**: Proteção contra zip-bomb, validação MIME, scanning de vírus
- **Conformidade LGPD**: Relatórios detalhados e gestão de incidentes

## Instalação Rápida

### Comando Único (Root)
```bash
wget -O install.sh https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-root.sh && chmod +x install.sh && ./install.sh seudominio.com
```

### Comando Único (Usuário)
```bash
wget -O install.sh https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-completo.sh && chmod +x install.sh && ./install.sh seudominio.com
```

## Requisitos

- Ubuntu 22.04 LTS
- Node.js 20+
- PostgreSQL 14+
- Redis 6+
- Nginx
- 2GB RAM mínimo
- 20GB espaço em disco

## Configuração

### Variáveis de Ambiente
```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/ncrisis
REDIS_URL=redis://default:pass@localhost:6379
OPENAI_API_KEY=sk-sua_chave_aqui
SENDGRID_API_KEY=SG.sua_chave_aqui
```

### API Keys Necessárias
- **OpenAI**: Para análise contextual e embeddings
- **SendGrid**: Para notificações por email

## Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React + TS    │◄──►│   Express + TS  │◄──►│   PostgreSQL    │
│   WebSocket     │    │   BullMQ        │    │   Redis         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Desenvolvimento

### Início Rápido
```bash
# Clonar repositório
git clone https://github.com/resper1965/PrivacyShield.git
cd PrivacyShield

# Instalar dependências
npm install

# Configurar ambiente
cp .env.example .env

# Executar desenvolvimento
npm run dev
```

### Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento
npm run build        # Build produção
npm run test         # Testes
npm run lint         # Linting
npm start           # Iniciar produção
```

## Deployment

### Opções de Deploy

1. **VPS/Servidor Próprio** (Recomendado)
   - Script automatizado completo
   - SSL automático
   - 15-20 minutos para produção

2. **Replit Deploy**
   - Um clique para deploy
   - Domínio .replit.app gratuito

3. **Docker** (Próxima versão)
   - Containerização completa
   - Orquestração com compose

### Gerenciamento Pós-Deploy
```bash
cd /opt/ncrisis
./manage.sh status      # Status dos serviços
./manage.sh logs        # Logs em tempo real
./manage.sh restart     # Reiniciar aplicação
./manage.sh backup      # Backup banco
```

## API Endpoints

### Core
- `GET /health` - Health check
- `GET /api/queue/status` - Status das filas

### Upload & Processamento
- `POST /api/v1/archives/upload` - Upload ZIP
- `GET /api/v1/reports/detections` - Relatórios

### IA & Busca
- `POST /api/v1/chat` - Chat semântico
- `POST /api/v1/embeddings` - Gerar embeddings

## Monitoramento

### Health Checks
```bash
curl https://seudominio.com/health
```

### Logs
```bash
journalctl -u ncrisis -f
```

### Métricas
- Status dos serviços
- Filas de processamento
- Estatísticas de detecção
- Performance da IA

## Segurança

- Headers seguros (Helmet)
- Rate limiting
- Validação rigorosa
- Proteção CSRF
- SSL obrigatório
- Firewall configurado

## Contribuição

1. Fork o projeto
2. Crie uma branch feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## Licença

Este projeto está licenciado sob a MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## Suporte

- **Documentação**: `/docs`
- **Issues**: GitHub Issues
- **Logs**: `/var/log/ncrisis-install.log`

## Roadmap

- [ ] Interface mobile
- [ ] API v2 com GraphQL
- [ ] Machine Learning personalizado
- [ ] Integração Microsoft 365
- [ ] Dashboard analytics avançado

---

**N.Crisis v2.1** - Plataforma PII Detection & LGPD Compliance  
Desenvolvido com ❤️ para proteção de dados pessoais
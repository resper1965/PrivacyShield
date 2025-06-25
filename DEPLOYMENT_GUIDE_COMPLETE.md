# N.Crisis - Guia Completo de Deploy em Produção

**Versão**: 2.1 (June 2025)  
**Repositório**: https://github.com/resper1965/PrivacyShield  
**Domínio**: monster.e-ness.com.br

## Visão Geral do Sistema

O N.Crisis é uma plataforma completa de detecção de PII (Informações Pessoais Identificáveis) e conformidade LGPD com capacidades avançadas de IA:

### Funcionalidades Principais

- **Detecção PII**: 7 tipos de dados brasileiros (CPF, CNPJ, RG, CEP, Email, Telefone, Nome)
- **Busca Semântica**: Integração OpenAI + FAISS para consultas inteligentes
- **Chat IA**: Sistema de perguntas e respostas baseado em documentos processados
- **Automação N8N**: Integração webhook para workflows automatizados
- **Relatórios LGPD**: Dashboards de conformidade e análise de riscos

### Arquitetura Tecnológica

- **Backend**: Node.js 20 + TypeScript + Express.js
- **Banco de Dados**: PostgreSQL 15 com Prisma ORM
- **IA/ML**: OpenAI GPT-3.5-turbo + text-embedding-3-small
- **Busca Vetorial**: FAISS IndexFlatL2 (1536 dimensões)
- **Cache**: Redis para BullMQ queues
- **Segurança**: ClamAV, Helmet, CORS, validação MIME

## Pré-requisitos do Servidor

### Especificações Mínimas
- **OS**: Ubuntu 22.04 LTS ou CentOS 8+
- **CPU**: 4 cores (8 recomendado para IA)
- **RAM**: 8GB (16GB recomendado)
- **Disco**: 100GB SSD
- **Rede**: Conexão estável para APIs OpenAI

### Domínio e DNS
- Domínio configurado (ex: monster.e-ness.com.br)
- Certificado SSL válido
- Portas abertas: 80, 443, 5000

## Instalação Automatizada

### 1. Preparação Inicial

```bash
# 1. Acesso SSH ao servidor
ssh root@monster.e-ness.com.br

# 2. Atualização do sistema
apt update && apt upgrade -y

# 3. Configuração de variáveis
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token_aqui"
export DOMAIN="monster.e-ness.com.br"
```

### 2. Download e Execução

```bash
# Download do script principal
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -H "Accept: application/vnd.github.v3.raw" \
  -o install-and-start.sh \
  https://api.github.com/repos/resper1965/PrivacyShield/contents/install-and-start.sh

# Permissão de execução
chmod +x install-and-start.sh

# Execução da instalação
./install-and-start.sh
```

### 3. Configuração de Serviços

O script configura automaticamente:
- ✅ PostgreSQL 15 com database `ncrisis`
- ✅ Redis server para filas
- ✅ Node.js 20 + dependências npm
- ✅ ClamAV antivirus
- ✅ Firewall UFW
- ✅ Systemd service `ncrisis`

## Configuração de APIs Externas

### OpenAI API Key (Obrigatório)

1. Acesse: https://platform.openai.com/api-keys
2. Crie uma nova API key
3. Configure no arquivo `.env`:

```bash
# Editar configuração
nano /opt/ncrisis/.env

# Adicionar/atualizar
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
```

### SendGrid (Email - Opcional)

```bash
# No arquivo .env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@monster.e-ness.com.br
```

### N8N Webhook (Automação - Opcional)

```bash
# No arquivo .env
N8N_WEBHOOK_URL=https://n8n.monster.e-ness.com.br/webhook/incident-handler
```

## Endpoints e APIs Disponíveis

### Core APIs
- `POST /api/v1/archives/upload` - Upload de arquivos ZIP
- `GET /api/v1/reports/detections` - Relatórios de detecções
- `GET /health` - Health check do sistema

### AI/ML APIs
- `POST /api/v1/embeddings` - Geração de embeddings OpenAI
- `POST /api/v1/search/semantic` - Busca semântica FAISS
- `POST /api/v1/chat` - Chat inteligente com contexto

### Integration APIs
- `POST /api/v1/n8n/webhook/incident` - Webhook N8N

## Verificação da Instalação

### 1. Status dos Serviços

```bash
# Verificar serviço principal
systemctl status ncrisis

# Verificar PostgreSQL
systemctl status postgresql

# Verificar Redis
systemctl status redis-server

# Verificar ClamAV
systemctl status clamav-daemon
```

### 2. Health Checks

```bash
# API principal
curl http://localhost:5000/health

# Embeddings API
curl http://localhost:5000/api/v1/embeddings/health

# Chat API
curl http://localhost:5000/api/v1/chat/health

# FAISS search
curl http://localhost:5000/api/v1/search/stats
```

### 3. Teste de Funcionalidades

```bash
# Teste de upload (usar arquivo ZIP de teste)
curl -X POST http://localhost:5000/api/v1/archives/upload \
  -F "file=@test.zip"

# Teste de chat IA
curl -X POST http://localhost:5000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "O que você encontrou sobre CPF?"}'
```

## Monitoramento e Logs

### Logs do Sistema

```bash
# Logs da aplicação
journalctl -u ncrisis -f

# Logs PostgreSQL
tail -f /var/log/postgresql/postgresql-15-main.log

# Logs ClamAV
tail -f /var/log/clamav/clamav.log
```

### Métricas Importantes

- **CPU**: Monitorar durante processamento de IA
- **RAM**: FAISS pode usar ~2GB para índices grandes
- **Disco**: Arquivos processados em `/opt/ncrisis/uploads`
- **Rede**: Latência para APIs OpenAI

## Manutenção e Backup

### Backup Regular

```bash
# Script de backup automático
cat > /opt/ncrisis/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/ncrisis/backups"
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -U ncrisis_user ncrisis > $BACKUP_DIR/db_$DATE.sql

# Backup uploads e configurações
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /opt/ncrisis/uploads /opt/ncrisis/.env

# Limpeza (manter últimos 7 dias)
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /opt/ncrisis/backup.sh

# Configurar cron (diário às 2h)
echo "0 2 * * * /opt/ncrisis/backup.sh" | crontab -
```

### Atualizações

```bash
# Parar serviço
systemctl stop ncrisis

# Atualizar código
cd /opt/ncrisis
git pull origin main

# Instalar dependências
npm install

# Executar migrações
npm run db:push

# Reiniciar serviço
systemctl start ncrisis
```

## Troubleshooting

### Problemas Comuns

**1. OpenAI API Errors**
```bash
# Verificar API key
echo $OPENAI_API_KEY

# Testar conectividade
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models
```

**2. FAISS Memory Issues**
```bash
# Verificar uso de memória
free -h

# Reinicializar índice FAISS
curl -X POST http://localhost:5000/api/v1/search/rebuild
```

**3. Database Connection**
```bash
# Testar conexão PostgreSQL
psql -U ncrisis_user -d ncrisis -h localhost

# Verificar status
systemctl status postgresql
```

### Performance Tuning

**PostgreSQL (config em `/etc/postgresql/15/main/postgresql.conf`)**
```
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 256MB
max_connections = 100
```

**Node.js Environment**
```bash
# No arquivo .env
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
```

## Segurança

### Firewall UFW
```bash
# Portas permitidas
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 5000/tcp  # N.Crisis API
ufw enable
```

### SSL/TLS
```bash
# Usar Let's Encrypt
certbot --nginx -d monster.e-ness.com.br
```

### Environment Security
```bash
# Permissões do arquivo .env
chmod 600 /opt/ncrisis/.env
chown ncrisis:ncrisis /opt/ncrisis/.env
```

## Contato e Suporte

- **Repositório**: https://github.com/resper1965/PrivacyShield
- **Documentação**: `/opt/ncrisis/README.md`
- **Logs**: `/var/log/ncrisis/`

---

**N.Crisis v2.1** - Sistema Inteligente de Detecção PII com IA  
*Última atualização: June 25, 2025*
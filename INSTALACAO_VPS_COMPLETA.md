# N.Crisis - Guia Completo de Instalação VPS

Sistema completo de detecção PII e LGPD com funcionalidades AI avançadas.

## 📋 Visão Geral

O N.Crisis é uma plataforma completa para detectar informações pessoais (PII) e garantir conformidade com a LGPD, incluindo:

- **Detecção PII**: 7 tipos de dados brasileiros (CPF, CNPJ, RG, CEP, Email, Telefone, Nome)
- **Análise AI**: Chat inteligente e análise de risco com OpenAI
- **Busca Semântica**: FAISS vector search para documentos
- **Relatórios LGPD**: Compliance reports detalhados
- **Segurança**: ClamAV virus scanning e validação
- **WebSocket**: Atualizações em tempo real

## ⚡ Instalação Rápida (Recomendada)

### Pré-requisitos
- **VPS Ubuntu 22.04** (mínimo 4GB RAM, 40GB storage)
- **Acesso root via SSH**
- **Domínio configurado**: monster.e-ness.com.br
- **Tokens necessários**: GitHub e OpenAI

### 1. Configurar Credenciais

```bash
# Conectar ao servidor
ssh root@monster.e-ness.com.br

# Configurar tokens (obrigatório)
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_github_token_here"
export OPENAI_API_KEY="sk-proj-your_openai_key_here"
export SENDGRID_API_KEY="SG.your_sendgrid_key_here"  # Opcional
```

### 2. Executar Instalação Automatizada

```bash
# Download e execução em uma linha
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -sSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-ncrisis.sh | bash

# OU download separado para controle total
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -o install-ncrisis.sh \
  https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-ncrisis.sh

chmod +x install-ncrisis.sh
./install-ncrisis.sh
```

### 3. Verificação

```bash
# Status dos serviços
systemctl status ncrisis nginx postgresql redis-server

# Teste da aplicação
curl https://monster.e-ness.com.br/health

# Teste AI
curl https://monster.e-ness.com.br/api/v1/search/stats
```

### 4. Acesso Web

- **URL Principal**: https://monster.e-ness.com.br
- **Chat AI**: https://monster.e-ness.com.br/busca-ia
- **Dashboard**: https://monster.e-ness.com.br/

## 🔧 Opções Avançadas do Script

```bash
# Ver todas as opções
./install-ncrisis.sh --help

# Atualização com backup
./install-ncrisis.sh --update --backup

# Reinstalação forçada
./install-ncrisis.sh --force

# Domínio customizado
./install-ncrisis.sh --domain=meudominio.com.br

# Pular SSL automático
./install-ncrisis.sh --skip-ssl
```

## 🛠️ Instalação Manual Detalhada

### 1. Preparação do Sistema

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências essenciais
apt install -y curl wget git build-essential software-properties-common \
    jq htop unzip ufw fail2ban nginx certbot python3-certbot-nginx

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verificar versões
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 2. Configuração PostgreSQL

```bash
# Instalar PostgreSQL
apt install -y postgresql postgresql-contrib

# Configurar usuário e banco
sudo -u postgres psql << 'EOF'
CREATE USER ncrisis_user WITH PASSWORD 'senha_segura_aqui';
CREATE DATABASE ncrisis_db OWNER ncrisis_user;
GRANT ALL PRIVILEGES ON DATABASE ncrisis_db TO ncrisis_user;
ALTER USER ncrisis_user CREATEDB;

-- Configurações de performance
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
SELECT pg_reload_conf();
\q
EOF

# Configurar autenticação
echo "local   ncrisis_db    ncrisis_user                            md5" >> /etc/postgresql/15/main/pg_hba.conf
systemctl restart postgresql
systemctl enable postgresql
```

### 3. Configuração Redis

```bash
# Instalar Redis
apt install -y redis-server

# Configurações de produção
sed -i 's/^# maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sed -i 's/^# requirepass .*/requirepass ncrisis_redis_2025/' /etc/redis/redis.conf

systemctl restart redis-server
systemctl enable redis-server

# Testar Redis
redis-cli -a ncrisis_redis_2025 ping  # Deve retornar PONG
```

### 4. Configuração ClamAV

```bash
# Instalar ClamAV
apt install -y clamav clamav-daemon

# Atualizar definições de vírus
systemctl stop clamav-freshclam
freshclam
systemctl start clamav-freshclam
systemctl enable clamav-freshclam

# Iniciar daemon
systemctl start clamav-daemon
systemctl enable clamav-daemon

# Verificar status
systemctl status clamav-daemon
```

### 5. Instalação da Aplicação

```bash
# Criar diretório
mkdir -p /opt/ncrisis
cd /opt/ncrisis

# Clonar repositório privado
git clone https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git .

# Criar estrutura de diretórios
mkdir -p uploads tmp local_files shared_folders logs build

# Instalar dependências
npm ci --only=production --no-audit --no-fund
cd frontend && npm ci --only=production --no-audit --no-fund && cd ..
```

### 6. Configuração de Ambiente

```bash
# Criar arquivo .env de produção
cat > .env << 'EOF'
# =================================================================
# N.CRISIS PRODUCTION CONFIGURATION
# =================================================================

# SERVER
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# DATABASE
DATABASE_URL=postgresql://ncrisis_user:senha_segura_aqui@localhost:5432/ncrisis_db
PGHOST=localhost
PGPORT=5432
PGUSER=ncrisis_user
PGPASSWORD=senha_segura_aqui
PGDATABASE=ncrisis_db

# REDIS
REDIS_URL=redis://:ncrisis_redis_2025@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=ncrisis_redis_2025

# OPENAI (obrigatório para funcionalidades AI)
OPENAI_API_KEY=sk-proj-your_real_openai_key_here

# CLAMAV
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# UPLOAD
UPLOAD_DIR=/opt/ncrisis/uploads
TMP_DIR=/opt/ncrisis/tmp
MAX_FILE_SIZE=104857600

# SECURITY
CORS_ORIGINS=https://monster.e-ness.com.br

# SENDGRID (opcional)
SENDGRID_API_KEY=SG.your_sendgrid_key_here

# N8N (opcional)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/incident

# PERFORMANCE
WORKER_CONCURRENCY=5
QUEUE_MAX_JOBS=1000

# LOGGING
LOG_LEVEL=info
DEBUG=ncrisis:*
EOF

# Proteger configuração
chmod 600 .env
```

### 7. Build e Deploy

```bash
# Aplicar schema do banco
npm run db:push

# Compilar TypeScript
npm run build

# Compilar frontend
cd frontend && npm run build && cd ..

# Testar aplicação
node build/src/server-simple.js &
sleep 5
curl http://localhost:5000/health
kill %1
```

### 8. Configuração Systemd

```bash
# Criar usuário de sistema
useradd -r -s /bin/false -d /opt/ncrisis ncrisis
chown -R ncrisis:ncrisis /opt/ncrisis/{uploads,tmp,logs}

# Criar serviço
cat > /etc/systemd/system/ncrisis.service << 'EOF'
[Unit]
Description=N.Crisis PII Detection & LGPD Platform
Documentation=https://github.com/resper1965/PrivacyShield
After=network.target postgresql.service redis-server.service clamav-daemon.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
User=ncrisis
Group=ncrisis
WorkingDirectory=/opt/ncrisis
Environment=NODE_ENV=production
Environment=PORT=5000
EnvironmentFile=/opt/ncrisis/.env
ExecStart=/usr/bin/node build/src/server-simple.js
ExecReload=/bin/kill -s HUP $MAINPID

# Restart policy
Restart=always
RestartSec=10
TimeoutStartSec=60
TimeoutStopSec=30
KillMode=mixed

# Output
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ncrisis

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=/opt/ncrisis/uploads /opt/ncrisis/tmp /opt/ncrisis/logs

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096
LimitCORE=0
MemoryMax=2G

[Install]
WantedBy=multi-user.target
EOF

# Habilitar serviço
systemctl daemon-reload
systemctl enable ncrisis
```

### 9. Configuração Nginx

```bash
# Configurar site
cat > /etc/nginx/sites-available/ncrisis << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;

# Upstream
upstream ncrisis_backend {
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name monster.e-ness.com.br www.monster.e-ness.com.br;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name monster.e-ness.com.br www.monster.e-ness.com.br;
    
    # SSL configuration (managed by certbot)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # Client limits
    client_max_body_size 100M;
    client_body_timeout 300s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
    
    # Main application
    location / {
        limit_req zone=general burst=200 nodelay;
        
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API endpoints
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
    
    # Upload endpoints
    location ~ ^/api/.*/(upload|archives) {
        limit_req zone=upload burst=10 nodelay;
        
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600;
        
        client_max_body_size 100M;
        client_body_timeout 300s;
        proxy_request_buffering off;
    }
    
    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://ncrisis_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location = /health {
        proxy_pass http://ncrisis_backend;
        access_log off;
    }
    
    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar e iniciar
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### 10. Configuração de Segurança

```bash
# Firewall UFW
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable

# Fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban
```

### 11. SSL com Let's Encrypt

```bash
# Verificar DNS
dig +short monster.e-ness.com.br

# Obter certificado
certbot --nginx -d monster.e-ness.com.br --non-interactive --agree-tos --email admin@monster.e-ness.com.br

# Renovação automática
echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -
```

### 12. Scripts de Monitoramento

```bash
# Script de backup
cat > /opt/ncrisis/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/ncrisis"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup banco
pg_dump -U ncrisis_user -h localhost ncrisis_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /opt/ncrisis uploads

# Backup configuração
cp /opt/ncrisis/.env "$BACKUP_DIR/env_$DATE.backup"

# Limpar backups antigos
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.backup" -mtime +30 -delete

echo "Backup concluído: $DATE"
EOF

chmod +x /opt/ncrisis/backup.sh

# Script de monitoramento
cat > /opt/ncrisis/monitor.sh << 'EOF'
#!/bin/bash

echo "=== N.Crisis System Monitor ==="
echo "Date: $(date)"
echo ""

# Verificar serviços
echo "=== Services ==="
for service in ncrisis nginx postgresql redis-server clamav-daemon; do
    if systemctl is-active --quiet "$service"; then
        echo "✓ $service: Running"
    else
        echo "✗ $service: Stopped"
    fi
done

echo ""
echo "=== Application Health ==="
if curl -sf http://localhost:5000/health >/dev/null; then
    echo "✓ Application: Healthy"
else
    echo "✗ Application: Not responding"
fi

echo ""
echo "=== AI Services ==="
if curl -sf http://localhost:5000/api/v1/search/stats >/dev/null; then
    echo "✓ AI Services: Available"
else
    echo "✗ AI Services: Not available"
fi

echo ""
echo "=== Resources ==="
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
EOF

chmod +x /opt/ncrisis/monitor.sh

# Crontab para backup diário
echo "0 2 * * * /opt/ncrisis/backup.sh >> /var/log/ncrisis-backup.log 2>&1" | crontab -
echo "*/15 * * * * /opt/ncrisis/monitor.sh > /dev/null" | crontab -
```

### 13. Inicialização Final

```bash
# Iniciar todos os serviços
systemctl start ncrisis
systemctl start nginx

# Verificar status
systemctl status ncrisis nginx postgresql redis-server clamav-daemon

# Testar aplicação
curl -s https://monster.e-ness.com.br/health | jq
curl -s https://monster.e-ness.com.br/api/v1/search/stats | jq
```

## ✅ Validação da Instalação

### Testes Essenciais

```bash
# 1. Health Check Geral
curl -s https://monster.e-ness.com.br/health | jq

# 2. Teste de AI
curl -s https://monster.e-ness.com.br/api/v1/search/stats | jq

# 3. Teste de Chat AI
curl -X POST https://monster.e-ness.com.br/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"teste de conectividade","k":1}' | jq

# 4. Teste de Embeddings
curl -X POST https://monster.e-ness.com.br/api/v1/embeddings/health | jq

# 5. Verificar WebSocket
curl -s https://monster.e-ness.com.br/socket.io/?EIO=4&transport=polling

# 6. Verificar Upload
curl -X OPTIONS https://monster.e-ness.com.br/api/v1/archives/upload
```

### Interface Web - Funcionalidades Disponíveis

**Acesse**: https://monster.e-ness.com.br

1. **Dashboard Principal**
   - Cards de estatísticas em tempo real
   - Indicadores AI com métricas FAISS
   - Atividade recente de processamento

2. **Chat Inteligente** (`/busca-ia`)
   - Interface ChatGPT-like
   - Busca semântica em documentos
   - Respostas baseadas em contexto

3. **Upload de Arquivos**
   - Drag & drop interface
   - Análise IA automática
   - Score de risco em tempo real
   - Progress tracking via WebSocket

4. **Relatórios LGPD**
   - Consolidado geral
   - Por titular de dados
   - Por organização
   - Export CSV/PDF

5. **Configurações AI**
   - Status dos serviços OpenAI
   - Estatísticas FAISS
   - Configuração de embeddings

## 🔧 Manutenção e Operação

### Comandos Essenciais

```bash
# Logs da aplicação
journalctl -u ncrisis -f

# Status completo
/opt/ncrisis/monitor.sh

# Backup manual
/opt/ncrisis/backup.sh

# Reiniciar serviços
systemctl restart ncrisis nginx

# Atualização
cd /opt/ncrisis && git pull && npm run build && systemctl restart ncrisis
```

### Estrutura de Arquivos

```
/opt/ncrisis/
├── build/              # Aplicação compilada
├── frontend/           # Frontend React
├── src/               # Código TypeScript
├── uploads/           # Arquivos enviados
├── tmp/              # Arquivos temporários
├── logs/             # Logs da aplicação
├── .env              # Configuração de produção
├── backup.sh         # Script de backup
├── monitor.sh        # Script de monitoramento
└── package.json      # Dependências Node.js
```

### Logs Importantes

- **Aplicação**: `journalctl -u ncrisis`
- **Nginx**: `/var/log/nginx/ncrisis.*.log`
- **PostgreSQL**: `/var/log/postgresql/`
- **Backup**: `/var/log/ncrisis-backup.log`
- **Instalação**: `/var/log/ncrisis-install.log`

## 🚨 Troubleshooting

### Problemas Comuns

**1. Aplicação não inicia**
```bash
journalctl -u ncrisis -n 50
systemctl status ncrisis
node --version  # Verificar Node.js 20+
```

**2. Banco não conecta**
```bash
sudo -u postgres psql -c "\l"
systemctl status postgresql
PGPASSWORD=senha_aqui psql -U ncrisis_user -h localhost -d ncrisis_db -c "SELECT 1;"
```

**3. AI não funciona**
```bash
echo $OPENAI_API_KEY | cut -c1-10
curl -s http://localhost:5000/api/v1/embeddings/health
curl -s http://localhost:5000/api/v1/search/stats
```

**4. Upload falha**
```bash
systemctl status clamav-daemon
ls -la /opt/ncrisis/uploads
df -h  # Verificar espaço
```

**5. SSL não funciona**
```bash
nginx -t
certbot certificates
dig +short monster.e-ness.com.br
```

### Comandos de Diagnóstico

```bash
# Verificar portas
netstat -tlnp | grep -E ":5000|:80|:443|:5432|:6379|:3310"

# Verificar conectividade AI
curl -X POST http://localhost:5000/api/v1/embeddings/test \
  -H "Content-Type: application/json" \
  -d '{"text":"teste de conectividade"}'

# Testar WebSocket
curl -s http://localhost:5000/socket.io/?EIO=4&transport=polling

# Verificar recursos
htop
df -h
free -h
```

## 🎯 Próximos Passos

1. **Configure N8N** (se disponível)
   - URL webhook: `/api/v1/n8n/webhook/incident`
   - Configurar workflows de incidentes

2. **Backup Offsite**
   - Configure rsync para backup remoto
   - AWS S3 ou storage externo

3. **Monitoramento Avançado**
   - Prometheus + Grafana
   - Alertas por email/SMS

4. **Segurança Adicional**
   - WAF (Web Application Firewall)
   - Rate limiting avançado
   - Autenticação 2FA

5. **Escalabilidade**
   - Load balancer para múltiplas instâncias
   - Database clustering
   - Redis clustering

---

**N.Crisis** - Sistema completo para detecção PII e conformidade LGPD com IA  
© 2025 - Documentação unificada para instalação em produção
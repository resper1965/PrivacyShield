# Guia Completo de Instalação VPS - N.Crisis v2.1

Sistema completo de detecção PII e LGPD com funcionalidades AI avançadas.

## 📋 Pré-requisitos

### Servidor
- **VPS Ubuntu 22.04 LTS** (mínimo 4GB RAM, 40GB storage)
- **Domínio configurado**: monster.e-ness.com.br
- **Acesso root via SSH**
- **Firewall liberado** nas portas 80, 443, 22

### Credenciais Necessárias
- **GitHub Personal Access Token** (repositório privado)
- **OpenAI API Key** (para funcionalidades AI)
- **SendGrid API Key** (opcional, para notificações)

## 🚀 Instalação Automatizada

### Passo 1: Configurar Ambiente

```bash
# Conectar ao servidor
ssh root@monster.e-ness.com.br

# Configurar token GitHub (obrigatório)
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token_here"

# Configurar chaves API (recomendado)
export OPENAI_API_KEY="sk-proj-your_openai_key_here"
export SENDGRID_API_KEY="SG.your_sendgrid_key_here"
```

### Passo 2: Download e Execução

```bash
# Download do script principal
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -o install-vps-complete.sh \
  https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-vps-complete.sh

# Tornar executável
chmod +x install-vps-complete.sh

# Executar instalação
./install-vps-complete.sh
```

### Passo 3: Configuração de Produção

```bash
# Navegar para diretório
cd /opt/ncrisis

# Configurar variáveis de ambiente
cp .env.production.example .env
nano .env

# Aplicar configurações do banco
npm run db:push

# Compilar aplicação
npm run build

# Iniciar serviços
systemctl start ncrisis
systemctl enable ncrisis
```

## 🛠️ Instalação Manual Detalhada

### 1. Preparação do Sistema

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências essenciais
apt install -y curl wget git build-essential software-properties-common

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# Verificar versões
node --version  # v20.x.x
npm --version   # 10.x.x
```

### 2. Configuração PostgreSQL

```bash
# Instalar PostgreSQL 15
apt install -y postgresql postgresql-contrib

# Configurar usuário e banco
sudo -u postgres psql << 'EOF'
CREATE USER ncrisis_user WITH PASSWORD 'senha_segura_aqui';
CREATE DATABASE ncrisis_db OWNER ncrisis_user;
GRANT ALL PRIVILEGES ON DATABASE ncrisis_db TO ncrisis_user;
ALTER USER ncrisis_user CREATEDB;
\q
EOF

# Configurar acesso local
echo "local   all             ncrisis_user                            md5" >> /etc/postgresql/15/main/pg_hba.conf
systemctl restart postgresql
systemctl enable postgresql
```

### 3. Configuração Redis

```bash
# Instalar Redis
apt install -y redis-server

# Configurar Redis
sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

# Testar Redis
redis-cli ping  # Deve retornar PONG
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

### 5. Clone e Configuração da Aplicação

```bash
# Criar diretório
mkdir -p /opt/ncrisis
cd /opt/ncrisis

# Clonar repositório privado
git clone https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git .

# Instalar dependências backend
npm install

# Instalar dependências frontend
cd frontend && npm install && cd ..

# Criar diretórios necessários
mkdir -p uploads tmp local_files shared_folders logs
```

### 6. Configuração de Ambiente

```bash
# Copiar configuração de produção
cp .env.production.example .env

# Editar configurações
nano .env
```

**Arquivo .env de produção:**

```env
# =================================================================
# PRODUCTION CONFIGURATION - N.Crisis v2.1
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
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# OPENAI (obrigatório para funcionalidades AI)
OPENAI_API_KEY=sk-proj-your_real_openai_key_here

# CLAMAV
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# UPLOAD CONFIGURATION
UPLOAD_DIR=/opt/ncrisis/uploads
TMP_DIR=/opt/ncrisis/tmp
MAX_FILE_SIZE=104857600

# SECURITY
CORS_ORIGINS=https://monster.e-ness.com.br

# SENDGRID (opcional)
SENDGRID_API_KEY=SG.your_sendgrid_key_here

# N8N INTEGRATION (opcional)
# N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/incident

# PERFORMANCE
WORKER_CONCURRENCY=5
QUEUE_MAX_JOBS=1000

# LOGGING
LOG_LEVEL=info
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
# Criar service
cat > /etc/systemd/system/ncrisis.service << 'EOF'
[Unit]
Description=N.Crisis PII Detection & LGPD Platform v2.1
After=network.target postgresql.service redis-server.service clamav-daemon.service
Requires=postgresql.service redis-server.service clamav-daemon.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ncrisis
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/node build/src/server-simple.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ncrisis

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/ncrisis/uploads /opt/ncrisis/tmp /opt/ncrisis/logs

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# Recarregar systemd
systemctl daemon-reload
systemctl enable ncrisis
```

### 9. Configuração Nginx

```bash
# Instalar Nginx
apt install -y nginx

# Configurar site
cat > /etc/nginx/sites-available/ncrisis << 'EOF'
server {
    listen 80;
    server_name monster.e-ness.com.br;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name monster.e-ness.com.br;
    
    # SSL Configuration (configure seu certificado)
    ssl_certificate /etc/ssl/certs/monster.e-ness.com.br.crt;
    ssl_certificate_key /etc/ssl/private/monster.e-ness.com.br.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # Client upload limits
    client_max_body_size 100M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:5000;
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
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API rate limiting
    location /api/ {
        limit_req zone=api burst=100 nodelay;
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Rate limiting
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
EOF

# Ativar site
ln -s /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
systemctl enable nginx
```

### 10. Configuração Firewall

```bash
# Configurar UFW
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# Verificar status
ufw status
```

### 11. SSL/TLS com Let's Encrypt

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obter certificado
certbot --nginx -d monster.e-ness.com.br

# Configurar renovação automática
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

## 🚀 Inicialização Final

```bash
# Iniciar todos os serviços
systemctl start ncrisis
systemctl start nginx

# Verificar status
systemctl status ncrisis
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
systemctl status clamav-daemon

# Testar aplicação
curl -k https://monster.e-ness.com.br/health
```

## ✅ Validação da Instalação

### Testes de Funcionalidade

```bash
# 1. Health Check Geral
curl -s https://monster.e-ness.com.br/health | jq

# 2. Teste de AI (requer OPENAI_API_KEY)
curl -s https://monster.e-ness.com.br/api/v1/search/stats | jq

# 3. Teste de Chat AI
curl -X POST https://monster.e-ness.com.br/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"teste de conectividade","k":1}' | jq

# 4. Teste de Embeddings
curl -X POST https://monster.e-ness.com.br/api/v1/embeddings/health | jq

# 5. Verificar WebSocket
curl -s https://monster.e-ness.com.br/socket.io/?EIO=4&transport=polling
```

### Interface Web

1. **Acesse**: https://monster.e-ness.com.br
2. **Dashboard**: Verifique cards de estatísticas AI
3. **Busca IA**: Teste o chat inteligente em `/busca-ia`
4. **Upload**: Teste análise IA nos arquivos
5. **Configurações**: Verifique status dos serviços AI

## 🔧 Manutenção e Monitoramento

### Logs

```bash
# Logs da aplicação
journalctl -u ncrisis -f

# Logs específicos por componente
tail -f /opt/ncrisis/logs/app.log
tail -f /var/log/nginx/access.log
tail -f /var/log/postgresql/postgresql-15-main.log
```

### Backup Automatizado

```bash
# Script de backup
cat > /opt/ncrisis/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/ncrisis"
DATE=$(date +%Y%m%d_%H%M%S)

# Criar diretório
mkdir -p $BACKUP_DIR

# Backup do banco
pg_dump -U ncrisis_user -h localhost ncrisis_db > $BACKUP_DIR/db_$DATE.sql

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/ncrisis/uploads

# Backup da configuração
cp /opt/ncrisis/.env $BACKUP_DIR/env_$DATE.backup

# Limpar backups antigos (>30 dias)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.backup" -mtime +30 -delete

echo "Backup concluído: $DATE"
EOF

chmod +x /opt/ncrisis/backup.sh

# Crontab para backup diário
echo "0 2 * * * /opt/ncrisis/backup.sh" | crontab -
```

### Atualizações

```bash
# Script de atualização
cat > /opt/ncrisis/update.sh << 'EOF'
#!/bin/bash
cd /opt/ncrisis

# Backup antes da atualização
./backup.sh

# Parar serviço
systemctl stop ncrisis

# Atualizar código
git pull origin main

# Instalar dependências
npm install
cd frontend && npm install && cd ..

# Aplicar migrações
npm run db:push

# Compilar
npm run build
cd frontend && npm run build && cd ..

# Reiniciar serviço
systemctl start ncrisis

echo "Atualização concluída"
EOF

chmod +x /opt/ncrisis/update.sh
```

## 🔐 Segurança

### Configurações Avançadas

```bash
# Configurar fail2ban para SSH
apt install -y fail2ban

cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl restart fail2ban
systemctl enable fail2ban
```

### Monitoramento de Recursos

```bash
# Instalar htop e monitoramento
apt install -y htop iotop nethogs

# Script de monitoramento
cat > /opt/ncrisis/monitor.sh << 'EOF'
#!/bin/bash
echo "=== N.Crisis System Monitor ==="
echo "Date: $(date)"
echo ""

echo "=== CPU & Memory ==="
top -bn1 | head -10

echo ""
echo "=== Disk Usage ==="
df -h

echo ""
echo "=== Service Status ==="
systemctl is-active ncrisis nginx postgresql redis-server clamav-daemon

echo ""
echo "=== Application Health ==="
curl -s http://localhost:5000/health | jq '.status' 2>/dev/null || echo "App not responding"

echo ""
echo "=== AI Services ==="
curl -s http://localhost:5000/api/v1/search/stats | jq '.stats' 2>/dev/null || echo "AI services not available"
EOF

chmod +x /opt/ncrisis/monitor.sh
```

## 📞 Suporte e Troubleshooting

### Problemas Comuns

1. **Aplicação não inicia**
   ```bash
   journalctl -u ncrisis -n 50
   node --version  # Verificar Node.js 20+
   ```

2. **Banco de dados não conecta**
   ```bash
   sudo -u postgres psql -c "\l"
   systemctl status postgresql
   ```

3. **AI não funciona**
   ```bash
   echo $OPENAI_API_KEY | cut -c1-10  # Verificar chave
   curl -s http://localhost:5000/api/v1/embeddings/health
   ```

4. **Upload falha**
   ```bash
   systemctl status clamav-daemon
   ls -la /opt/ncrisis/uploads
   ```

### Comandos Úteis

```bash
# Reiniciar todos os serviços
systemctl restart ncrisis nginx postgresql redis-server clamav-daemon

# Verificar portas em uso
netstat -tlnp | grep -E ":5000|:80|:443|:5432|:6379|:3310"

# Verificar logs em tempo real
multitail /var/log/nginx/access.log /var/log/nginx/error.log -s 2 -ci green

# Testar conectividade AI
curl -X POST http://localhost:5000/api/v1/embeddings/test \
  -H "Content-Type: application/json" \
  -d '{"text":"teste de conectividade"}'
```

## 🎯 Próximos Passos

1. **Configure N8N** (se disponível)
2. **Ajuste limites de upload** conforme necessidade
3. **Configure monitoramento avançado** (Prometheus/Grafana)
4. **Integre com sistemas SIEM** existentes
5. **Configure backup offsite**

---

**N.Crisis v2.1** - PII Detection & LGPD Compliance Platform com AI  
© 2025 - Sistema completo para conformidade LGPD
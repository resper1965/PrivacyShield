#!/bin/bash

# =================================================================
# N.Crisis Production Installation Script v2.1
# Sistema completo PII Detection & LGPD com funcionalidades AI
# =================================================================
# Uso: ./install-production-v2.1.sh
# Requer: Ubuntu 22.04, tokens GitHub e OpenAI configurados
# =================================================================

set -euo pipefail

# Configurações
NCRISIS_DIR="/opt/ncrisis"
NCRISIS_USER="ncrisis"
LOG_FILE="/var/log/ncrisis-install.log"
DOMAIN="monster.e-ness.com.br"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Verificar se é root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "Este script deve ser executado como root"
    fi
}

# Verificar variáveis de ambiente
check_environment() {
    log "Verificando variáveis de ambiente..."
    
    if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
        error "GITHUB_PERSONAL_ACCESS_TOKEN não está configurado"
    fi
    
    if [[ -z "${OPENAI_API_KEY:-}" ]]; then
        warning "OPENAI_API_KEY não configurado - funcionalidades AI serão limitadas"
    fi
    
    log "Variáveis de ambiente verificadas"
}

# Atualizar sistema
update_system() {
    log "Atualizando sistema..."
    apt update && apt upgrade -y
    apt install -y curl wget git build-essential software-properties-common \
        jq htop unzip ufw fail2ban nginx certbot python3-certbot-nginx
    log "Sistema atualizado"
}

# Instalar Node.js 20
install_nodejs() {
    log "Instalando Node.js 20..."
    
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$NODE_VERSION" -ge 20 ]]; then
            log "Node.js $NODE_VERSION já instalado"
            return 0
        fi
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    # Verificar instalação
    NODE_VER=$(node --version)
    NPM_VER=$(npm --version)
    log "Node.js $NODE_VER e npm $NPM_VER instalados"
}

# Configurar PostgreSQL
setup_postgresql() {
    log "Configurando PostgreSQL..."
    
    apt install -y postgresql postgresql-contrib
    
    # Configurar usuário e banco
    sudo -u postgres psql << 'EOF'
CREATE USER ncrisis_user WITH PASSWORD 'ncrisis_prod_2025!';
CREATE DATABASE ncrisis_db OWNER ncrisis_user;
GRANT ALL PRIVILEGES ON DATABASE ncrisis_db TO ncrisis_user;
ALTER USER ncrisis_user CREATEDB;
\q
EOF
    
    # Configurar acesso
    PG_VERSION=$(ls /etc/postgresql/)
    echo "local   all             ncrisis_user                            md5" >> "/etc/postgresql/$PG_VERSION/main/pg_hba.conf"
    
    systemctl restart postgresql
    systemctl enable postgresql
    
    log "PostgreSQL configurado"
}

# Configurar Redis
setup_redis() {
    log "Configurando Redis..."
    
    apt install -y redis-server
    sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
    
    systemctl restart redis-server
    systemctl enable redis-server
    
    # Testar Redis
    if redis-cli ping >/dev/null 2>&1; then
        log "Redis configurado e funcionando"
    else
        error "Falha na configuração do Redis"
    fi
}

# Configurar ClamAV
setup_clamav() {
    log "Configurando ClamAV..."
    
    apt install -y clamav clamav-daemon
    
    # Parar freshclam para atualizar
    systemctl stop clamav-freshclam || true
    
    # Atualizar definições (pode demorar)
    info "Atualizando definições de vírus (pode demorar alguns minutos)..."
    freshclam || warning "Falha ao atualizar definições - continuando..."
    
    systemctl start clamav-freshclam
    systemctl enable clamav-freshclam
    systemctl start clamav-daemon
    systemctl enable clamav-daemon
    
    # Aguardar daemon inicializar
    sleep 10
    
    if systemctl is-active --quiet clamav-daemon; then
        log "ClamAV configurado"
    else
        warning "ClamAV pode não estar funcionando corretamente"
    fi
}

# Clonar aplicação
clone_application() {
    log "Clonando aplicação N.Crisis..."
    
    # Remover diretório se existir
    if [[ -d "$NCRISIS_DIR" ]]; then
        warning "Diretório $NCRISIS_DIR já existe - fazendo backup"
        mv "$NCRISIS_DIR" "${NCRISIS_DIR}.backup.$(date +%s)"
    fi
    
    mkdir -p "$NCRISIS_DIR"
    cd "$NCRISIS_DIR"
    
    # Clonar repositório privado
    git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" .
    
    # Criar diretórios necessários
    mkdir -p uploads tmp local_files shared_folders logs
    
    log "Aplicação clonada"
}

# Instalar dependências
install_dependencies() {
    log "Instalando dependências..."
    
    cd "$NCRISIS_DIR"
    
    # Backend
    npm ci --only=production
    
    # Frontend
    cd frontend
    npm ci --only=production
    cd ..
    
    log "Dependências instaladas"
}

# Configurar ambiente
setup_environment() {
    log "Configurando ambiente de produção..."
    
    cd "$NCRISIS_DIR"
    
    # Criar arquivo .env
    cat > .env << EOF
# =================================================================
# N.CRISIS PRODUCTION CONFIGURATION v2.1
# =================================================================

# SERVER
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# DATABASE
DATABASE_URL=postgresql://ncrisis_user:ncrisis_prod_2025!@localhost:5432/ncrisis_db
PGHOST=localhost
PGPORT=5432
PGUSER=ncrisis_user
PGPASSWORD=ncrisis_prod_2025!
PGDATABASE=ncrisis_db

# REDIS
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# OPENAI
OPENAI_API_KEY=${OPENAI_API_KEY:-}

# CLAMAV
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# UPLOAD
UPLOAD_DIR=$NCRISIS_DIR/uploads
TMP_DIR=$NCRISIS_DIR/tmp
MAX_FILE_SIZE=104857600

# SECURITY
CORS_ORIGINS=https://$DOMAIN

# SENDGRID
SENDGRID_API_KEY=${SENDGRID_API_KEY:-}

# PERFORMANCE
WORKER_CONCURRENCY=5
QUEUE_MAX_JOBS=1000

# LOGGING
LOG_LEVEL=info
DEBUG=ncrisis:*
EOF
    
    log "Ambiente configurado"
}

# Build aplicação
build_application() {
    log "Compilando aplicação..."
    
    cd "$NCRISIS_DIR"
    
    # Aplicar schema do banco
    npm run db:push
    
    # Compilar TypeScript
    npm run build
    
    # Compilar frontend
    cd frontend
    npm run build
    cd ..
    
    log "Aplicação compilada"
}

# Configurar systemd
setup_systemd() {
    log "Configurando serviço systemd..."
    
    cat > /etc/systemd/system/ncrisis.service << EOF
[Unit]
Description=N.Crisis PII Detection & LGPD Platform v2.1
Documentation=https://github.com/resper1965/PrivacyShield
After=network.target postgresql.service redis-server.service clamav-daemon.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=$NCRISIS_DIR
Environment=NODE_ENV=production
Environment=PORT=5000
ExecStart=/usr/bin/node build/src/server-simple.js
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=10
TimeoutStopSec=30
KillMode=process

# Output
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ncrisis

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=$NCRISIS_DIR/uploads $NCRISIS_DIR/tmp $NCRISIS_DIR/logs

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096
LimitCORE=0

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable ncrisis
    
    log "Serviço systemd configurado"
}

# Configurar Nginx
setup_nginx() {
    log "Configurando Nginx..."
    
    # Configuração do site
    cat > /etc/nginx/sites-available/ncrisis << EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=upload:10m rate=2r/s;

server {
    listen 80;
    server_name $DOMAIN;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL will be configured by certbot
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    
    # Client limits
    client_max_body_size 100M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;
    
    # Main application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
    }
    
    # Upload endpoints with stricter rate limiting
    location ~ ^/api/.*/(upload|archives) {
        limit_req zone=upload burst=5 nodelay;
        
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 600;
        proxy_send_timeout 600;
        
        # Increase limits for file uploads
        client_max_body_size 100M;
        client_body_timeout 300s;
    }
    
    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }
    
    # Health check (no rate limiting)
    location /health {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        access_log off;
    }
}
EOF
    
    # Ativar site
    ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
    nginx -t
    
    systemctl restart nginx
    systemctl enable nginx
    
    log "Nginx configurado"
}

# Configurar firewall
setup_firewall() {
    log "Configurando firewall..."
    
    # UFW
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    
    # Fail2ban
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 ::1

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

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 600
EOF
    
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log "Firewall configurado"
}

# Configurar SSL
setup_ssl() {
    log "Configurando SSL com Let's Encrypt..."
    
    # Verificar se domínio resolve
    if ! dig +short "$DOMAIN" >/dev/null; then
        warning "Domínio $DOMAIN não resolve - SSL será configurado manualmente"
        return 0
    fi
    
    # Obter certificado
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" || {
        warning "Falha ao obter certificado SSL - configure manualmente"
        return 0
    }
    
    # Configurar renovação automática
    echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
    
    log "SSL configurado"
}

# Configurar monitoramento
setup_monitoring() {
    log "Configurando scripts de monitoramento..."
    
    # Script de backup
    cat > "$NCRISIS_DIR/backup.sh" << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/ncrisis"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup banco
pg_dump -U ncrisis_user -h localhost ncrisis_db > "$BACKUP_DIR/db_$DATE.sql"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /opt/ncrisis uploads

# Backup configuração
cp /opt/ncrisis/.env "$BACKUP_DIR/env_$DATE.backup"

# Limpar backups antigos
find "$BACKUP_DIR" -name "*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.backup" -mtime +30 -delete

echo "Backup concluído: $DATE"
EOF
    
    chmod +x "$NCRISIS_DIR/backup.sh"
    
    # Script de monitoramento
    cat > "$NCRISIS_DIR/monitor.sh" << 'EOF'
#!/bin/bash
echo "=== N.Crisis System Monitor ==="
echo "Date: $(date)"
echo ""

# Service status
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
echo "=== Resource Usage ==="
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "Memory: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "Disk: $(df -h / | awk 'NR==2{print $5}')"
EOF
    
    chmod +x "$NCRISIS_DIR/monitor.sh"
    
    # Crontab para backup diário
    echo "0 2 * * * $NCRISIS_DIR/backup.sh >> /var/log/ncrisis-backup.log 2>&1" | crontab -
    
    log "Monitoramento configurado"
}

# Iniciar serviços
start_services() {
    log "Iniciando serviços..."
    
    # Verificar se tudo está pronto
    if ! systemctl is-active --quiet postgresql; then
        error "PostgreSQL não está rodando"
    fi
    
    if ! systemctl is-active --quiet redis-server; then
        error "Redis não está rodando"
    fi
    
    # Iniciar N.Crisis
    systemctl start ncrisis
    
    # Aguardar inicialização
    sleep 10
    
    # Verificar status
    if systemctl is-active --quiet ncrisis; then
        log "N.Crisis iniciado com sucesso"
    else
        error "Falha ao iniciar N.Crisis - verificar logs: journalctl -u ncrisis"
    fi
}

# Testes finais
run_tests() {
    log "Executando testes finais..."
    
    # Aguardar estabilização
    sleep 5
    
    # Teste health check
    if curl -sf http://localhost:5000/health >/dev/null; then
        log "✓ Health check: OK"
    else
        error "✗ Health check: FALHOU"
    fi
    
    # Teste AI (se OpenAI configurado)
    if [[ -n "${OPENAI_API_KEY:-}" ]]; then
        if curl -sf http://localhost:5000/api/v1/search/stats >/dev/null; then
            log "✓ AI Services: OK"
        else
            warning "✗ AI Services: Limitados"
        fi
    fi
    
    # Teste upload
    if curl -sf http://localhost:5000/api/v1/archives/upload -X OPTIONS >/dev/null; then
        log "✓ Upload endpoint: OK"
    else
        warning "✗ Upload endpoint: Verificar"
    fi
    
    log "Testes concluídos"
}

# Resumo final
show_summary() {
    log "Instalação concluída com sucesso!"
    
    echo ""
    echo "=================================================================="
    echo "🎉 N.CRISIS v2.1 INSTALADO COM SUCESSO!"
    echo "=================================================================="
    echo ""
    echo "📍 Localização: $NCRISIS_DIR"
    echo "🌐 URL: https://$DOMAIN"
    echo "📊 Health Check: https://$DOMAIN/health"
    echo "🤖 AI Chat: https://$DOMAIN/busca-ia"
    echo ""
    echo "📋 SERVIÇOS:"
    echo "   • N.Crisis: systemctl status ncrisis"
    echo "   • Nginx: systemctl status nginx"
    echo "   • PostgreSQL: systemctl status postgresql"
    echo "   • Redis: systemctl status redis-server"
    echo "   • ClamAV: systemctl status clamav-daemon"
    echo ""
    echo "🔧 COMANDOS ÚTEIS:"
    echo "   • Logs: journalctl -u ncrisis -f"
    echo "   • Monitor: $NCRISIS_DIR/monitor.sh"
    echo "   • Backup: $NCRISIS_DIR/backup.sh"
    echo ""
    echo "🔐 PRÓXIMOS PASSOS:"
    echo "   1. Configure SSL: certbot --nginx -d $DOMAIN"
    echo "   2. Configure backup offsite"
    echo "   3. Configure N8N (se disponível)"
    echo "   4. Teste todas as funcionalidades"
    echo ""
    echo "📞 SUPORTE:"
    echo "   • Logs de instalação: $LOG_FILE"
    echo "   • Status: $NCRISIS_DIR/monitor.sh"
    echo ""
    echo "=================================================================="
}

# Função principal
main() {
    log "Iniciando instalação N.Crisis v2.1..."
    
    check_root
    check_environment
    update_system
    install_nodejs
    setup_postgresql
    setup_redis
    setup_clamav
    clone_application
    install_dependencies
    setup_environment
    build_application
    setup_systemd
    setup_nginx
    setup_firewall
    setup_ssl
    setup_monitoring
    start_services
    run_tests
    show_summary
    
    log "Instalação finalizada com sucesso!"
}

# Executar instalação
main "$@"
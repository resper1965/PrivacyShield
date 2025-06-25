#!/bin/bash

# N.Crisis - Instalação Completa como Root
# Execute com: sudo ./install-root.sh dominio.com

set -e

DOMAIN=${1:-"localhost"}
USER_NAME=${2:-"ncrisis"}
LOG_FILE="/var/log/ncrisis-install.log"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funções
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

error_exit() {
    echo -e "${RED}[ERRO]${NC} $1"
    exit 1
}

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║        N.Crisis Root Install         ║"
echo "║      Instalação Completa Root        ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "🌐 Domínio: $DOMAIN"
echo "👤 Usuário: $USER_NAME"
echo "📋 Log: $LOG_FILE"
echo ""

# Criar log
touch "$LOG_FILE"
log "🚀 Iniciando instalação completa N.Crisis como root"

# Criar usuário se não existir
if ! id "$USER_NAME" &>/dev/null; then
    log "Criando usuário $USER_NAME..."
    useradd -m -s /bin/bash "$USER_NAME"
    usermod -aG sudo "$USER_NAME"
    log "✅ Usuário $USER_NAME criado"
else
    log "✅ Usuário $USER_NAME já existe"
fi

# ETAPA 1: Limpeza
log "🧹 ETAPA 1: Limpeza do ambiente atual"

# Parar serviços
systemctl stop ncrisis 2>/dev/null || true
systemctl disable ncrisis 2>/dev/null || true

# Remover aplicação
rm -rf /opt/ncrisis || true
rm -f /etc/systemd/system/ncrisis.service || true
systemctl daemon-reload

# Limpar Nginx
rm -f /etc/nginx/sites-enabled/ncrisis* || true
rm -f /etc/nginx/sites-available/ncrisis* || true
rm -f /etc/nginx/sites-enabled/*.com || true
rm -f /etc/nginx/sites-available/*.com || true

# Restaurar default se necessário
if [ ! -f /etc/nginx/sites-enabled/default ]; then
    ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/ || true
fi

nginx -t && systemctl reload nginx 2>/dev/null || true

log "✅ Limpeza concluída"

# ETAPA 2: Instalação do Sistema
log "📦 ETAPA 2: Instalação do sistema base"

# Atualizar sistema
log "Atualizando Ubuntu..."
apt-get update >> "$LOG_FILE" 2>&1
apt-get upgrade -y >> "$LOG_FILE" 2>&1
apt-get install -y curl wget gnupg lsb-release software-properties-common git >> "$LOG_FILE" 2>&1

# Node.js 20
log "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >> "$LOG_FILE" 2>&1
apt-get install -y nodejs >> "$LOG_FILE" 2>&1

NODE_VERSION=$(node --version)
log "✅ Node.js instalado: $NODE_VERSION"

# PostgreSQL
log "Instalando PostgreSQL..."
apt-get install -y postgresql postgresql-contrib >> "$LOG_FILE" 2>&1
systemctl start postgresql
systemctl enable postgresql

# Redis
log "Instalando Redis..."
apt-get install -y redis-server >> "$LOG_FILE" 2>&1
systemctl start redis-server
systemctl enable redis-server

# Nginx
log "Instalando Nginx..."
apt-get install -y nginx >> "$LOG_FILE" 2>&1
systemctl start nginx
systemctl enable nginx

# Certbot
log "Instalando Certbot..."
apt-get install -y certbot python3-certbot-nginx >> "$LOG_FILE" 2>&1

log "✅ Sistema base instalado"

# ETAPA 3: Configurar Banco
log "🗄️  ETAPA 3: Configurando banco de dados"

DB_NAME="ncrisis"
DB_USER="ncrisis"
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# PostgreSQL
sudo -u postgres createuser $DB_USER 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';" >> "$LOG_FILE" 2>&1
sudo -u postgres createdb -O $DB_USER $DB_NAME 2>/dev/null || true

# Redis
echo "requirepass $REDIS_PASS" >> /etc/redis/redis.conf
systemctl restart redis-server

log "✅ Banco configurado"

# ETAPA 4: Instalar N.Crisis
log "📦 ETAPA 4: Instalando N.Crisis"

cd /opt
rm -rf ncrisis || true
git clone https://github.com/resper1965/PrivacyShield.git ncrisis >> "$LOG_FILE" 2>&1
chown -R $USER_NAME:$USER_NAME /opt/ncrisis
cd /opt/ncrisis

# Instalar dependências como usuário
log "Instalando dependências..."
sudo -u $USER_NAME npm ci >> "$LOG_FILE" 2>&1

# Criar .env
log "Criando configuração..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
REDIS_URL=redis://default:$REDIS_PASS@localhost:6379
OPENAI_API_KEY=
SENDGRID_API_KEY=
CORS_ORIGINS=https://$DOMAIN,http://localhost:5000
CLAMAV_ENABLED=false
UPLOAD_MAX_SIZE=104857600
FAISS_INDEX_PATH=./data/faiss_index
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
EOF

chown $USER_NAME:$USER_NAME .env

log "✅ N.Crisis instalado"

# ETAPA 5: Configurar Nginx
log "🌐 ETAPA 5: Configurando Nginx"

tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=upload:10m rate=1r/s;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /api/v1/archives/upload {
        limit_req zone=upload burst=5 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 100M;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "✅ Nginx configurado"

# ETAPA 6: Criar serviço systemd
log "⚙️  ETAPA 6: Criando serviço systemd"

tee /etc/systemd/system/ncrisis.service > /dev/null << EOF
[Unit]
Description=N.Crisis PII Detection Platform
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=/opt/ncrisis
ExecStart=/usr/bin/ts-node src/server-clean.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000
EnvironmentFile=/opt/ncrisis/.env

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/ncrisis

# Limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ncrisis

log "✅ Serviço criado"

# ETAPA 7: Firewall
log "🔥 ETAPA 7: Configurando firewall"

ufw allow OpenSSH >> "$LOG_FILE" 2>&1
ufw allow 'Nginx Full' >> "$LOG_FILE" 2>&1
ufw --force enable >> "$LOG_FILE" 2>&1

log "✅ Firewall configurado"

# ETAPA 8: SSL (se não for localhost)
if [ "$DOMAIN" != "localhost" ]; then
    log "🔒 ETAPA 8: Configurando SSL"
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN >> "$LOG_FILE" 2>&1 || warning "Configure SSL manualmente depois"
fi

# ETAPA 9: Iniciar aplicação
log "🚀 ETAPA 9: Iniciando aplicação"

systemctl start ncrisis
sleep 15

# Criar script de gerenciamento
cat > /opt/ncrisis/manage.sh << 'EOF'
#!/bin/bash
case "$1" in
    status)
        echo "📊 Status dos Serviços:"
        systemctl is-active postgresql && echo "   ✅ PostgreSQL: Ativo" || echo "   ❌ PostgreSQL: Inativo"
        systemctl is-active redis-server && echo "   ✅ Redis: Ativo" || echo "   ❌ Redis: Inativo"
        systemctl is-active nginx && echo "   ✅ Nginx: Ativo" || echo "   ❌ Nginx: Inativo"
        systemctl is-active ncrisis && echo "   ✅ N.Crisis: Ativo" || echo "   ❌ N.Crisis: Inativo"
        echo ""
        curl -s http://localhost:5000/health | jq . 2>/dev/null || echo "Health check aguardando..."
        ;;
    logs) journalctl -u ncrisis -f ;;
    restart) systemctl restart ncrisis; echo "✅ Reiniciado" ;;
    stop) systemctl stop ncrisis; echo "⏹️ Parado" ;;
    start) systemctl start ncrisis; echo "▶️ Iniciado" ;;
    backup)
        sudo -u postgres pg_dump ncrisis > "/opt/ncrisis/backup-$(date +%Y%m%d_%H%M%S).sql"
        echo "✅ Backup criado"
        ;;
    *)
        echo "Uso: $0 {status|logs|restart|stop|start|backup}"
        ;;
esac
EOF

chmod +x /opt/ncrisis/manage.sh
chown $USER_NAME:$USER_NAME /opt/ncrisis/manage.sh

# VERIFICAÇÃO FINAL
log "🔍 Verificação final..."

echo ""
echo "=================================="
echo "✅ N.Crisis Instalação Completa"
echo "=================================="
echo ""
echo "🌐 URLs:"
if [ "$DOMAIN" != "localhost" ]; then
    echo "   Aplicação: https://$DOMAIN"
    echo "   Health: https://$DOMAIN/health"
else
    echo "   Aplicação: http://localhost:5000"
    echo "   Health: http://localhost:5000/health"
fi
echo ""
echo "📊 Status dos Serviços:"
systemctl is-active postgresql && echo "   ✅ PostgreSQL: Ativo" || echo "   ❌ PostgreSQL: Inativo"
systemctl is-active redis-server && echo "   ✅ Redis: Ativo" || echo "   ❌ Redis: Inativo"
systemctl is-active nginx && echo "   ✅ Nginx: Ativo" || echo "   ❌ Nginx: Inativo"
systemctl is-active ncrisis && echo "   ✅ N.Crisis: Ativo" || echo "   ❌ N.Crisis: Inativo"
echo ""
echo "🛠️ Gerenciamento:"
echo "   cd /opt/ncrisis"
echo "   ./manage.sh status"
echo "   ./manage.sh logs"
echo "   ./manage.sh restart"
echo ""
echo "⚠️ IMPORTANTE: Configure suas API keys:"
echo "   nano /opt/ncrisis/.env"
echo "   systemctl restart ncrisis"
echo ""
echo "🔐 Credenciais do banco (salve em local seguro):"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASS"
echo "   Redis Password: $REDIS_PASS"
echo ""
echo "👤 Usuário da aplicação: $USER_NAME"
echo "📋 Log completo: $LOG_FILE"
echo ""

# Testar aplicação
sleep 5
if curl -s http://localhost:5000/health >/dev/null; then
    echo "✅ Aplicação respondendo corretamente!"
else
    warning "Aplicação ainda inicializando... Aguarde alguns minutos"
fi

log "🎉 Instalação concluída com sucesso!"
echo ""
echo "🚀 Para executar comandos de gerenciamento:"
echo "   cd /opt/ncrisis && ./manage.sh status"
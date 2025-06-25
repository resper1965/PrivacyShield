#!/bin/bash

# N.Crisis Fresh Installation Script
# Instalação completa e limpa do N.Crisis em Ubuntu 22.04

set -e

# Configurações
DOMAIN=${1:-"localhost"}
USER=$(whoami)
APP_DIR="/opt/ncrisis"
DB_NAME="ncrisis"
DB_USER="ncrisis"
DB_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
REDIS_PASS=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
LOG_FILE="/var/log/ncrisis-install.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Funções de log
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

error_exit() {
    echo -e "${RED}[ERROR]${NC} $1"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
    exit 1
}

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║        N.Crisis Fresh Install        ║"
echo "║     PII Detection & LGPD Platform    ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "🌐 Domínio: $DOMAIN"
echo "📁 Diretório: $APP_DIR"
echo "👤 Usuário: $USER"
echo "📋 Log: $LOG_FILE"
echo ""

# Verificações iniciais
if [[ $EUID -eq 0 ]]; then
    error_exit "Não execute como root. Use sudo quando necessário."
fi

if [ "$DOMAIN" = "localhost" ]; then
    warning "Usando localhost. Para produção, especifique um domínio: ./install-fresh.sh meudominio.com"
fi

# Criar arquivo de log
sudo touch "$LOG_FILE"
sudo chown $USER:$USER "$LOG_FILE"

log "🚀 Iniciando instalação N.Crisis v2.1"

# 1. Atualizar sistema
log "📦 Atualizando sistema Ubuntu..."
sudo apt-get update >> "$LOG_FILE" 2>&1
sudo apt-get upgrade -y >> "$LOG_FILE" 2>&1
sudo apt-get install -y curl wget gnupg lsb-release software-properties-common >> "$LOG_FILE" 2>&1

log "✅ Sistema atualizado"

# 2. Instalar Node.js 20
log "📦 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >> "$LOG_FILE" 2>&1
sudo apt-get install -y nodejs >> "$LOG_FILE" 2>&1

# Verificar instalação
NODE_VERSION=$(node --version)
log "✅ Node.js instalado: $NODE_VERSION"

# 3. Instalar PostgreSQL
log "🗄️  Instalando PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib >> "$LOG_FILE" 2>&1
sudo systemctl start postgresql >> "$LOG_FILE" 2>&1
sudo systemctl enable postgresql >> "$LOG_FILE" 2>&1

# Configurar PostgreSQL
log "🗄️  Configurando PostgreSQL..."
sudo -u postgres createuser $DB_USER >> "$LOG_FILE" 2>&1 || true
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';" >> "$LOG_FILE" 2>&1
sudo -u postgres createdb -O $DB_USER $DB_NAME >> "$LOG_FILE" 2>&1 || true

log "✅ PostgreSQL configurado"

# 4. Instalar Redis
log "🔴 Instalando Redis..."
sudo apt-get install -y redis-server >> "$LOG_FILE" 2>&1
sudo systemctl start redis-server >> "$LOG_FILE" 2>&1
sudo systemctl enable redis-server >> "$LOG_FILE" 2>&1

# Configurar Redis
echo "requirepass $REDIS_PASS" | sudo tee -a /etc/redis/redis.conf >> "$LOG_FILE" 2>&1
sudo systemctl restart redis-server >> "$LOG_FILE" 2>&1

log "✅ Redis configurado"

# 5. Instalar Nginx
log "🌐 Instalando Nginx..."
sudo apt-get install -y nginx >> "$LOG_FILE" 2>&1
sudo systemctl start nginx >> "$LOG_FILE" 2>&1
sudo systemctl enable nginx >> "$LOG_FILE" 2>&1

log "✅ Nginx instalado"

# 6. Instalar Certbot
log "🔒 Instalando Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx >> "$LOG_FILE" 2>&1

log "✅ Certbot instalado"

# 7. Baixar aplicação N.Crisis
log "📦 Baixando N.Crisis..."
cd /opt
sudo rm -rf ncrisis || true
sudo git clone https://github.com/resper1965/PrivacyShield.git ncrisis >> "$LOG_FILE" 2>&1 || error_exit "Falha ao clonar repositório"
sudo chown -R $USER:$USER $APP_DIR
cd $APP_DIR

log "✅ N.Crisis baixado"

# 8. Instalar dependências
log "📦 Instalando dependências Node.js..."
npm ci >> "$LOG_FILE" 2>&1 || error_exit "Falha ao instalar dependências"

log "✅ Dependências instaladas"

# 9. Criar arquivo .env
log "⚙️  Criando configuração..."
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

log "✅ Configuração criada"

# 10. Configurar Nginx
log "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
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

# Ativar site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

log "✅ Nginx configurado"

# 11. Criar serviço systemd
log "⚙️  Criando serviço systemd..."
sudo tee /etc/systemd/system/ncrisis.service > /dev/null << EOF
[Unit]
Description=N.Crisis PII Detection Platform
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/ts-node src/server-clean.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000
EnvironmentFile=$APP_DIR/.env

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

# Limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

log "✅ Serviço systemd criado"

# 12. Configurar firewall
log "🔥 Configurando firewall..."
sudo ufw allow OpenSSH >> "$LOG_FILE" 2>&1
sudo ufw allow 'Nginx Full' >> "$LOG_FILE" 2>&1
sudo ufw --force enable >> "$LOG_FILE" 2>&1

log "✅ Firewall configurado"

# 13. Iniciar serviços
log "🚀 Iniciando serviços..."
sudo systemctl daemon-reload >> "$LOG_FILE" 2>&1
sudo systemctl enable ncrisis >> "$LOG_FILE" 2>&1
sudo systemctl start ncrisis >> "$LOG_FILE" 2>&1

# Aguardar inicialização
log "⏳ Aguardando inicialização..."
sleep 15

# Verificar status
if systemctl is-active --quiet ncrisis; then
    log "✅ N.Crisis iniciado com sucesso"
else
    warning "Serviço precisa de ajustes - verificando logs"
    sudo journalctl -u ncrisis -n 10 --no-pager
fi

# 14. Configurar SSL (se não for localhost)
if [ "$DOMAIN" != "localhost" ]; then
    log "🔒 Configurando SSL..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN >> "$LOG_FILE" 2>&1 || warning "SSL configurado manualmente depois"
fi

# 15. Criar scripts de gerenciamento
log "🛠️  Criando scripts de gerenciamento..."
cat > manage.sh << 'EOF'
#!/bin/bash

case "$1" in
    status)
        echo "📊 Status dos Serviços:"
        systemctl is-active postgresql && echo "   ✅ PostgreSQL: Ativo" || echo "   ❌ PostgreSQL: Inativo"
        systemctl is-active redis-server && echo "   ✅ Redis: Ativo" || echo "   ❌ Redis: Inativo"
        systemctl is-active nginx && echo "   ✅ Nginx: Ativo" || echo "   ❌ Nginx: Inativo"
        systemctl is-active ncrisis && echo "   ✅ N.Crisis: Ativo" || echo "   ❌ N.Crisis: Inativo"
        echo ""
        curl -s http://localhost:5000/health | jq . 2>/dev/null || echo "Health check falhou"
        ;;
    logs)
        sudo journalctl -u ncrisis -f
        ;;
    restart)
        sudo systemctl restart ncrisis
        echo "✅ N.Crisis reiniciado"
        ;;
    stop)
        sudo systemctl stop ncrisis
        echo "⏹️  N.Crisis parado"
        ;;
    start)
        sudo systemctl start ncrisis
        echo "▶️  N.Crisis iniciado"
        ;;
    backup)
        sudo -u postgres pg_dump ncrisis > "backup-$(date +%Y%m%d_%H%M%S).sql"
        echo "✅ Backup criado"
        ;;
    *)
        echo "Uso: $0 {status|logs|restart|stop|start|backup}"
        ;;
esac
EOF

chmod +x manage.sh

log "✅ Scripts de gerenciamento criados"

# 16. Verificação final
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
echo "📊 Gerenciamento:"
echo "   Status: ./manage.sh status"
echo "   Logs: ./manage.sh logs"
echo "   Restart: ./manage.sh restart"
echo ""
echo "⚠️  IMPORTANTE: Configure suas API keys:"
echo "   sudo nano $APP_DIR/.env"
echo "   sudo systemctl restart ncrisis"
echo ""
echo "🔐 Credenciais do banco (salve em local seguro):"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASS"
echo ""
echo "📋 Logs completos: $LOG_FILE"
echo ""
log "🎉 Instalação concluída com sucesso!"
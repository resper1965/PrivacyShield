#!/bin/bash

# N.Crisis - Instalação Completa Automatizada
# Execute como usuário normal (não root)

set -e

DOMAIN=${1:-"localhost"}
LOG_FILE="/tmp/ncrisis-install.log"

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

# Verificar se não é root
if [[ $EUID -eq 0 ]]; then
    error_exit "NÃO execute como root! Execute como usuário normal: ./install-completo.sh"
fi

# Verificar se tem sudo
if ! sudo -n true 2>/dev/null; then
    warning "Será necessário senha sudo durante a instalação"
fi

# Banner
echo -e "${BLUE}"
echo "╔══════════════════════════════════════╗"
echo "║        N.Crisis Instalação           ║"
echo "║      Limpeza + Fresh Install         ║"
echo "╚══════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo "🌐 Domínio: $DOMAIN"
echo "📋 Log: $LOG_FILE"
echo ""

# Criar log
touch "$LOG_FILE"
log "🚀 Iniciando instalação completa N.Crisis"

# ETAPA 1: Limpeza
log "🧹 ETAPA 1: Limpeza do ambiente atual"

# Parar serviços
log "Parando serviços..."
sudo systemctl stop ncrisis 2>/dev/null || true
sudo systemctl disable ncrisis 2>/dev/null || true

# Remover aplicação
log "Removendo aplicação anterior..."
sudo rm -rf /opt/ncrisis || true
sudo rm -f /etc/systemd/system/ncrisis.service || true
sudo systemctl daemon-reload

# Limpar Nginx
log "Limpando Nginx..."
sudo rm -f /etc/nginx/sites-enabled/ncrisis* || true
sudo rm -f /etc/nginx/sites-available/ncrisis* || true
sudo rm -f /etc/nginx/sites-enabled/*.com || true
sudo rm -f /etc/nginx/sites-available/*.com || true

# Restaurar default se necessário
if [ ! -f /etc/nginx/sites-enabled/default ]; then
    sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/ || true
fi

sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || true

log "✅ Limpeza concluída"

# ETAPA 2: Instalação do Sistema
log "📦 ETAPA 2: Instalação do sistema base"

# Atualizar sistema
log "Atualizando Ubuntu..."
sudo apt-get update >> "$LOG_FILE" 2>&1
sudo apt-get upgrade -y >> "$LOG_FILE" 2>&1
sudo apt-get install -y curl wget gnupg lsb-release software-properties-common >> "$LOG_FILE" 2>&1

# Node.js 20
log "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >> "$LOG_FILE" 2>&1
sudo apt-get install -y nodejs >> "$LOG_FILE" 2>&1

NODE_VERSION=$(node --version)
log "✅ Node.js instalado: $NODE_VERSION"

# PostgreSQL
log "Instalando PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib >> "$LOG_FILE" 2>&1
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Redis
log "Instalando Redis..."
sudo apt-get install -y redis-server >> "$LOG_FILE" 2>&1
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Nginx
log "Instalando Nginx..."
sudo apt-get install -y nginx >> "$LOG_FILE" 2>&1
sudo systemctl start nginx
sudo systemctl enable nginx

# Certbot
log "Instalando Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx >> "$LOG_FILE" 2>&1

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
echo "requirepass $REDIS_PASS" | sudo tee -a /etc/redis/redis.conf >> "$LOG_FILE" 2>&1
sudo systemctl restart redis-server

log "✅ Banco configurado"

# ETAPA 4: Instalar N.Crisis
log "📦 ETAPA 4: Instalando N.Crisis"

cd /opt
sudo rm -rf ncrisis || true
sudo git clone https://github.com/resper1965/PrivacyShield.git ncrisis >> "$LOG_FILE" 2>&1
sudo chown -R $(whoami):$(whoami) /opt/ncrisis
cd /opt/ncrisis

# Instalar dependências
log "Instalando dependências..."
npm ci >> "$LOG_FILE" 2>&1

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

log "✅ N.Crisis instalado"

# ETAPA 5: Configurar Nginx
log "🌐 ETAPA 5: Configurando Nginx"

sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
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

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

log "✅ Nginx configurado"

# ETAPA 6: Criar serviço systemd
log "⚙️  ETAPA 6: Criando serviço systemd"

sudo tee /etc/systemd/system/ncrisis.service > /dev/null << EOF
[Unit]
Description=N.Crisis PII Detection Platform
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=/opt/ncrisis
ExecStart=/usr/bin/ts-node src/server-clean.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000
EnvironmentFile=/opt/ncrisis/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ncrisis

log "✅ Serviço criado"

# ETAPA 7: Firewall
log "🔥 ETAPA 7: Configurando firewall"

sudo ufw allow OpenSSH >> "$LOG_FILE" 2>&1
sudo ufw allow 'Nginx Full' >> "$LOG_FILE" 2>&1
sudo ufw --force enable >> "$LOG_FILE" 2>&1

log "✅ Firewall configurado"

# ETAPA 8: SSL (se não for localhost)
if [ "$DOMAIN" != "localhost" ]; then
    log "🔒 ETAPA 8: Configurando SSL"
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN >> "$LOG_FILE" 2>&1 || warning "Configure SSL manualmente depois"
fi

# ETAPA 9: Iniciar aplicação
log "🚀 ETAPA 9: Iniciando aplicação"

sudo systemctl start ncrisis
sleep 10

# Criar script de gerenciamento
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
        curl -s http://localhost:5000/health | jq . 2>/dev/null || echo "Health check aguardando..."
        ;;
    logs) sudo journalctl -u ncrisis -f ;;
    restart) sudo systemctl restart ncrisis; echo "✅ Reiniciado" ;;
    stop) sudo systemctl stop ncrisis; echo "⏹️ Parado" ;;
    start) sudo systemctl start ncrisis; echo "▶️ Iniciado" ;;
    *) echo "Uso: $0 {status|logs|restart|stop|start}" ;;
esac
EOF

chmod +x manage.sh

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
echo "   ./manage.sh status"
echo "   ./manage.sh logs"
echo "   ./manage.sh restart"
echo ""
echo "⚠️ IMPORTANTE: Configure suas API keys:"
echo "   sudo nano /opt/ncrisis/.env"
echo "   sudo systemctl restart ncrisis"
echo ""
echo "🔐 Credenciais do banco:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASS"
echo ""
echo "📋 Log completo: $LOG_FILE"
echo ""

log "🎉 Instalação concluída!"
#!/bin/bash

# Script de Instalação Simplificado N.Crisis
# Automatiza todo o processo sem interação manual

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Verificações iniciais
if [[ $EUID -ne 0 ]]; then
    error "Execute como root: sudo bash install-vps-simples.sh"
fi

log "🚀 Iniciando instalação simplificada do N.Crisis..."

# Configurações automáticas
DOMAIN="monster.e-ness.com.br"
NCRISIS_DIR="/opt/ncrisis"
DB_PASSWORD=$(openssl rand -hex 16)

# Tokens (definir antes de executar)
if [[ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]]; then
    error "GITHUB_PERSONAL_ACCESS_TOKEN deve ser definido antes da execução"
fi

if [[ -z "$OPENAI_API_KEY" ]]; then
    warn "OPENAI_API_KEY não definido - funcionalidades AI limitadas"
    export OPENAI_API_KEY="sk-placeholder-configure-later"
fi

# 1. Corrigir repositórios APT
log "🔧 Corrigindo repositórios APT..."
rm -f /etc/apt/sources.list.d/ubuntu-mirrors.list
rm -rf /var/lib/apt/lists/*
apt clean

# 2. Atualizar sistema
log "📦 Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt update
apt upgrade -y
apt install -y curl wget git build-essential software-properties-common jq htop unzip ufw fail2ban

# 3. Instalar Node.js 20
log "📦 Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. Instalar PostgreSQL
log "🗄️ Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Configurar banco
sudo -u postgres psql << EOF
CREATE USER ncrisis_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE ncrisis_db OWNER ncrisis_user;
GRANT ALL PRIVILEGES ON DATABASE ncrisis_db TO ncrisis_user;
\q
EOF

# 5. Instalar Redis
log "📋 Instalando Redis..."
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server

# 6. Instalar ClamAV
log "🛡️ Instalando ClamAV..."
apt install -y clamav clamav-daemon
systemctl enable clamav-daemon
systemctl start clamav-daemon

# 7. Instalar Nginx
log "🌐 Instalando Nginx..."
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx

# 8. Preparar diretório aplicação
log "📁 Preparando diretório da aplicação..."
rm -rf "$NCRISIS_DIR"
mkdir -p "$NCRISIS_DIR"
cd "$NCRISIS_DIR"

# 9. Clonar código
log "📥 Baixando código da aplicação..."
git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" .

# 10. Instalar dependências
log "📦 Instalando dependências da aplicação..."
npm ci --only=production --no-audit --no-fund

# Frontend
cd frontend
npm ci --only=production --no-audit --no-fund
npm run build
cd ..

# 11. Configurar ambiente
log "⚙️ Configurando ambiente..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

DATABASE_URL=postgresql://ncrisis_user:$DB_PASSWORD@localhost:5432/ncrisis_db

REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

OPENAI_API_KEY=$OPENAI_API_KEY

CORS_ORIGINS=https://$DOMAIN,http://localhost:5000
DOMAIN=$DOMAIN

CLAMAV_HOST=localhost
CLAMAV_PORT=3310
EOF

# 12. Aplicar migrações banco
log "🗄️ Configurando banco de dados..."
npx prisma generate
npx prisma db push --force-reset

# 13. Compilar aplicação
log "🔨 Compilando aplicação..."
npm run build

# 14. Configurar systemd
log "⚙️ Configurando serviço systemd..."
cat > /etc/systemd/system/ncrisis.service << EOF
[Unit]
Description=N.Crisis PII Detection Service
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=$NCRISIS_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node build/server-simple.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ncrisis

# 15. Configurar Nginx
log "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/ncrisis << EOF
server {
    listen 80;
    server_name $DOMAIN;

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

ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 16. Configurar SSL
log "🔒 Configurando SSL..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email || warn "SSL falhou - configure manualmente"

# 17. Configurar firewall
log "🛡️ Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

# 18. Iniciar serviços
log "🚀 Iniciando serviços..."
systemctl start ncrisis
systemctl start nginx

# 19. Verificar instalação
log "✅ Verificando instalação..."
sleep 5

if systemctl is-active --quiet ncrisis; then
    log "✅ Serviço N.Crisis: FUNCIONANDO"
else
    warn "⚠️ Serviço N.Crisis: PROBLEMA"
fi

if systemctl is-active --quiet nginx; then
    log "✅ Nginx: FUNCIONANDO"
else
    warn "⚠️ Nginx: PROBLEMA"
fi

if systemctl is-active --quiet postgresql; then
    log "✅ PostgreSQL: FUNCIONANDO"
else
    warn "⚠️ PostgreSQL: PROBLEMA"
fi

# Teste endpoint
if curl -sf "http://localhost:5000/health" >/dev/null; then
    log "✅ API Health: FUNCIONANDO"
else
    warn "⚠️ API Health: PROBLEMA"
fi

# 20. Relatório final
echo ""
echo "======================================"
echo "  N.CRISIS INSTALAÇÃO CONCLUÍDA"
echo "======================================"
echo ""
echo "🌐 URL: https://$DOMAIN"
echo "🔧 Logs: journalctl -u ncrisis -f"
echo "📁 Diretório: $NCRISIS_DIR"
echo ""
echo "⚙️ CONFIGURAÇÕES ADICIONAIS:"
echo "1. Edite $NCRISIS_DIR/.env para configurar OPENAI_API_KEY"
echo "2. Reinicie: systemctl restart ncrisis"
echo ""
echo "📊 VERIFICAR SERVIÇOS:"
echo "systemctl status ncrisis nginx postgresql redis-server"
echo ""

log "🎉 Instalação concluída! Acesse: https://$DOMAIN"
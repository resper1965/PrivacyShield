#!/bin/bash

# Instalação N.Crisis usando método simplificado
# Usa HTTPS com token como senha

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Verificar se é root
if [[ $EUID -ne 0 ]]; then
    error "Execute como root: sudo bash install-com-passphrase.sh"
fi

log "Instalação N.Crisis - Método Simplificado"

# Solicitar token se não definido
if [[ -z "$GITHUB_TOKEN" ]]; then
    echo "Digite seu GitHub Personal Access Token:"
    read -s GITHUB_TOKEN
    export GITHUB_TOKEN
fi

if [[ -z "$OPENAI_KEY" ]]; then
    echo "Digite sua OpenAI API Key (ou pressione Enter para configurar depois):"
    read -s OPENAI_KEY
    if [[ -z "$OPENAI_KEY" ]]; then
        OPENAI_KEY="configure-later"
    fi
    export OPENAI_KEY
fi

# Configurações
DOMAIN="monster.e-ness.com.br"
NCRISIS_DIR="/opt/ncrisis"
DB_PASSWORD=$(openssl rand -hex 16)

log "Corrigindo repositórios APT..."
rm -f /etc/apt/sources.list.d/ubuntu-mirrors.list
rm -rf /var/lib/apt/lists/*
apt clean
apt update

log "Instalando dependências do sistema..."
export DEBIAN_FRONTEND=noninteractive
apt upgrade -y
apt install -y curl wget git build-essential software-properties-common jq htop unzip ufw fail2ban

log "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

log "Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql << EOF
CREATE USER ncrisis_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE ncrisis_db OWNER ncrisis_user;
GRANT ALL PRIVILEGES ON DATABASE ncrisis_db TO ncrisis_user;
\q
EOF

log "Instalando Redis e ClamAV..."
apt install -y redis-server clamav clamav-daemon
systemctl enable redis-server clamav-daemon
systemctl start redis-server clamav-daemon

log "Instalando Nginx..."
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx

log "Preparando diretório da aplicação..."
rm -rf "$NCRISIS_DIR"
mkdir -p "$NCRISIS_DIR"
cd "$NCRISIS_DIR"

log "Clonando código usando token como senha..."
# Usar token como senha no clone HTTPS
git clone "https://oauth2:$GITHUB_TOKEN@github.com/resper1965/PrivacyShield.git" .

log "Instalando dependências..."
npm ci --only=production --no-audit --no-fund

cd frontend
npm ci --only=production --no-audit --no-fund
npm run build
cd ..

log "Configurando ambiente..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis_user:$DB_PASSWORD@localhost:5432/ncrisis_db
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=$OPENAI_KEY
CORS_ORIGINS=https://$DOMAIN,http://localhost:5000
DOMAIN=$DOMAIN
EOF

log "Configurando banco de dados..."
npx prisma generate
npx prisma db push --force-reset

log "Compilando aplicação..."
npm run build

log "Configurando serviço systemd..."
cat > /etc/systemd/system/ncrisis.service << EOF
[Unit]
Description=N.Crisis PII Detection Service
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=$NCRISIS_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node build/server-simple.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ncrisis

log "Configurando Nginx..."
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
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

log "Configurando SSL..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email || true

log "Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

log "Iniciando serviços..."
systemctl start ncrisis

log "Verificando instalação..."
sleep 5

if systemctl is-active --quiet ncrisis; then
    log "✓ N.Crisis: FUNCIONANDO"
else
    log "✗ N.Crisis: PROBLEMA"
fi

if curl -sf "http://localhost:5000/health" >/dev/null; then
    log "✓ API: FUNCIONANDO"
else
    log "✗ API: PROBLEMA"
fi

echo ""
echo "======================================"
echo "  INSTALAÇÃO CONCLUÍDA"
echo "======================================"
echo ""
echo "URL: https://$DOMAIN"
echo "Logs: journalctl -u ncrisis -f"
echo ""
if [[ "$OPENAI_KEY" == "configure-later" ]]; then
    echo "Configure OpenAI: nano $NCRISIS_DIR/.env"
    echo "Depois: systemctl restart ncrisis"
fi
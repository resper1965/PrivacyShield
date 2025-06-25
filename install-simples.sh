#!/bin/bash

#==============================================================================
# N.Crisis - Instalação Ultra Simples
# Execute: curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/install-simples.sh | sudo bash
#==============================================================================

set -e

log() { echo "[$(date +'%H:%M:%S')] $*"; }
error() { echo "ERROR: $*"; exit 1; }

[[ $EUID -eq 0 ]] || error "Execute como root: sudo bash"

log "N.Crisis - Instalação Automática"

# Config básica
DOMAIN="monster.e-ness.com.br"
INSTALL_DIR="/opt/ncrisis"
DB_PASSWORD=$(openssl rand -hex 16)

# Coleta simples
read -p "GitHub token (Enter se público): " GITHUB_TOKEN
if [[ -n "$GITHUB_TOKEN" ]]; then
    REPO_URL="https://oauth2:${GITHUB_TOKEN}@github.com/resper1965/PrivacyShield.git"
else
    REPO_URL="https://github.com/resper1965/PrivacyShield.git"
fi

read -p "OpenAI Key (Enter para pular): " -s OPENAI_KEY
echo

log "Limpando sistema..."
systemctl stop ncrisis 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true
cd "$INSTALL_DIR" 2>/dev/null && docker-compose down 2>/dev/null || true
rm -rf "$INSTALL_DIR"

log "Instalando dependências básicas..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y
apt install -y curl wget git nodejs npm nginx certbot python3-certbot-nginx ufw

# Docker simples
log "Instalando Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

log "Clonando código..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
git clone "$REPO_URL" .

log "Preparando dependências..."
# Fix package.json se necessário
if ! grep -q '"lockfileVersion"' package-lock.json 2>/dev/null; then
    rm -f package-lock.json
    npm install --package-lock-only
fi

# Backend
log "Instalando backend..."
npm install --production --no-audit --no-fund
npm run build 2>/dev/null || log "Build backend falhou - continuando..."

# Frontend
log "Instalando frontend..."
cd frontend
if ! grep -q '"lockfileVersion"' package-lock.json 2>/dev/null; then
    rm -f package-lock.json
    npm install --package-lock-only
fi
npm install --production --no-audit --no-fund
npm run build 2>/dev/null || log "Build frontend falhou - continuando..."
cd ..

log "Configurando ambiente..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis_user:${DB_PASSWORD}@postgres:5432/ncrisis_db
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=${OPENAI_KEY:-sk-configure-later}
DOMAIN=${DOMAIN}
CORS_ORIGINS=https://${DOMAIN}
EOF

log "Criando Docker Compose..."
cat > docker-compose.yml << EOF
version: '3.8'
services:
  app:
    build: .
    container_name: ncrisis-app
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file: .env
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    container_name: ncrisis-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ncrisis_db
      POSTGRES_USER: ncrisis_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    container_name: ncrisis-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install --production --no-audit
RUN mkdir -p uploads logs
EXPOSE 5000
CMD ["npm", "start"]
EOF

log "Configurando Nginx..."
cat > /etc/nginx/sites-available/ncrisis << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl enable nginx && systemctl start nginx

log "Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

log "Iniciando aplicação..."
docker-compose up -d --build

log "Aguardando inicialização..."
sleep 30

log "Configurando SSL..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email || log "Configure SSL manualmente depois"

log "Verificando..."
if curl -sf "http://localhost:5000/health" >/dev/null 2>&1; then
    log "✓ N.Crisis funcionando"
else
    log "⚠ Aguarde mais alguns minutos para inicialização completa"
fi

echo
echo "==========================================="
echo "         INSTALAÇÃO CONCLUÍDA"
echo "==========================================="
echo
echo "URL: https://${DOMAIN}"
echo "Diretório: ${INSTALL_DIR}"
echo
echo "Comandos úteis:"
echo "  Status:  cd ${INSTALL_DIR} && docker-compose ps"
echo "  Logs:    cd ${INSTALL_DIR} && docker-compose logs -f app"
echo "  Restart: cd ${INSTALL_DIR} && docker-compose restart"
echo
if [[ "$OPENAI_KEY" == "" ]]; then
    echo "Configure OpenAI:"
    echo "  nano ${INSTALL_DIR}/.env"
    echo "  cd ${INSTALL_DIR} && docker-compose restart"
fi
echo "==========================================="
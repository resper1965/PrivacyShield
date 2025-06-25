#!/bin/bash

#==============================================================================
# N.Crisis - Instalação Direta do GitHub
# Execute: curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/install-direto.sh | sudo bash
#==============================================================================

set -euo pipefail

# Configurações
readonly DOMAIN="monster.e-ness.com.br"
readonly INSTALL_DIR="/opt/ncrisis"
readonly N8N_DIR="/opt/n8n"

# Cores
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# Verificar root
[[ $EUID -eq 0 ]] || error "Execute como root: sudo bash install-direto.sh"

log "N.Crisis - Instalação Automática"

# Coleta interativa de configurações
echo "=== Configuração ==="
read -p "Tem GitHub token para repo privado? (y/n): " HAS_TOKEN
if [[ "$HAS_TOKEN" == "y" ]]; then
    read -p "GitHub Personal Access Token: " -s GITHUB_TOKEN
    echo
    REPO_URL="https://oauth2:${GITHUB_TOKEN}@github.com/resper1965/PrivacyShield.git"
    
    read -p "Instalar N8N também? (y/n): " INSTALL_N8N
else
    REPO_URL="https://github.com/resper1965/PrivacyShield.git"
    INSTALL_N8N="n"
fi

read -p "OpenAI API Key (Enter para pular): " -s OPENAI_KEY
echo
read -p "SendGrid API Key (Enter para pular): " -s SENDGRID_KEY
echo

# Gerar senhas
DB_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 12)

log "Limpando sistema..."
systemctl stop ncrisis 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true
cd "$INSTALL_DIR" 2>/dev/null && docker-compose down 2>/dev/null || true
cd "$N8N_DIR" 2>/dev/null && docker-compose down 2>/dev/null || true
rm -rf "$INSTALL_DIR" "$N8N_DIR"

log "Instalando dependências..."
export DEBIAN_FRONTEND=noninteractive
apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common ca-certificates gnupg lsb-release ufw nodejs npm

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# Nginx
apt install -y nginx certbot python3-certbot-nginx
systemctl enable nginx && systemctl start nginx

log "Clonando N.Crisis..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
git clone "$REPO_URL" .

log "Instalando dependências da aplicação..."

# Backend - gerar package-lock.json primeiro
npm install --package-lock-only
npm ci --omit=dev --no-audit --no-fund

# Frontend 
cd frontend
npm install --package-lock-only
npm ci --omit=dev --no-audit --no-fund
npm run build
cd ..

# Build backend
npm run build

log "Configurando ambiente..."
cat > .env << EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis_user:${DB_PASSWORD}@postgres:5432/ncrisis_db
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
OPENAI_API_KEY=${OPENAI_KEY:-sk-configure-later}
SENDGRID_API_KEY=${SENDGRID_KEY:-SG.configure-later}
DOMAIN=${DOMAIN}
CORS_ORIGINS=https://${DOMAIN}
JWT_SECRET=$(openssl rand -hex 32)
EOF

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
      - clamav

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
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  clamav:
    image: clamav/clamav:latest
    container_name: ncrisis-clamav
    restart: unless-stopped
    volumes:
      - clamav_data:/var/lib/clamav

volumes:
  postgres_data:
  redis_data:
  clamav_data:
EOF

cat > Dockerfile << 'EOF'
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY build ./build
COPY frontend/dist ./public
COPY node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
RUN mkdir -p uploads logs tmp
EXPOSE 5000
CMD ["node", "build/server-simple.js"]
EOF

# N8N se solicitado
if [[ "$INSTALL_N8N" == "y" ]]; then
    log "Configurando N8N..."
    mkdir -p "$N8N_DIR"
    cd "$N8N_DIR"
    
    cat > docker-compose.yml << EOF
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123
      - N8N_HOST=n8n.${DOMAIN}
      - WEBHOOK_URL=https://n8n.${DOMAIN}/
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  n8n_data:
EOF
fi

log "Configurando Nginx..."
cat > /etc/nginx/sites-available/ncrisis << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 100M;
    
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
}
EOF

ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

if [[ "$INSTALL_N8N" == "y" ]]; then
    cat > /etc/nginx/sites-available/n8n << EOF
server {
    listen 80;
    server_name n8n.${DOMAIN};
    
    location / {
        proxy_pass http://localhost:5678;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
fi

nginx -t && systemctl restart nginx

log "Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

log "Iniciando serviços..."
cd "$INSTALL_DIR"
docker-compose up -d

if [[ "$INSTALL_N8N" == "y" ]]; then
    cd "$N8N_DIR"
    docker-compose up -d
fi

sleep 30

log "Configurando SSL..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email || warn "Configure SSL manualmente"

if [[ "$INSTALL_N8N" == "y" ]]; then
    certbot --nginx -d "n8n.$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email || warn "Configure SSL N8N manualmente"
fi

log "Verificando..."
sleep 10
if curl -sf "http://localhost:5000/health" >/dev/null; then
    log "✓ N.Crisis funcionando"
else
    warn "Verifique logs: cd $INSTALL_DIR && docker-compose logs"
fi

echo
echo "======================================="
echo "      INSTALAÇÃO CONCLUÍDA"
echo "======================================="
echo
echo "URLs:"
echo "  N.Crisis: https://${DOMAIN}"
if [[ "$INSTALL_N8N" == "y" ]]; then
    echo "  N8N:      https://n8n.${DOMAIN} (admin:admin123)"
fi
echo
echo "Diretórios:"
echo "  N.Crisis: ${INSTALL_DIR}"
if [[ "$INSTALL_N8N" == "y" ]]; then
    echo "  N8N:      ${N8N_DIR}"
fi
echo
echo "Comandos:"
echo "  Status:   cd ${INSTALL_DIR} && docker-compose ps"
echo "  Logs:     cd ${INSTALL_DIR} && docker-compose logs -f"
echo "  Restart:  cd ${INSTALL_DIR} && docker-compose restart"
echo
if [[ "$OPENAI_KEY" == "" ]]; then
    echo "Configure APIs: nano ${INSTALL_DIR}/.env"
    echo "Reinicie: cd ${INSTALL_DIR} && docker-compose restart"
fi
echo "======================================="
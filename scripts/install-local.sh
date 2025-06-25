#!/bin/bash

# N.Crisis - Instalação Local Robusta
# Execute: sudo bash install-local.sh

set -e

log() {
    echo "[$(date +'%H:%M:%S')] $*"
}

error() {
    echo "ERROR: $*"
    exit 1
}

# Verificar root
if [ "$EUID" -ne 0 ]; then
    error "Execute como root: sudo bash install-local.sh"
fi

log "N.Crisis - Instalação Automática"

# Configurações
DOMAIN="monster.e-ness.com.br"
INSTALL_DIR="/opt/ncrisis"
DB_PASSWORD=$(openssl rand -hex 16)

# Coleta simples
echo "=== Configuração ==="
echo "GitHub token (Enter para repositório público):"
read -r GITHUB_TOKEN

if [ -n "$GITHUB_TOKEN" ]; then
    REPO_URL="https://oauth2:${GITHUB_TOKEN}@github.com/resper1965/PrivacyShield.git"
    echo "Usando repositório privado"
else
    REPO_URL="https://github.com/resper1965/PrivacyShield.git"
    echo "Usando repositório público"
fi

echo "OpenAI API Key (Enter para pular):"
read -r -s OPENAI_KEY
echo

log "Limpando instalações anteriores..."
systemctl stop ncrisis 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true

if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    docker-compose down 2>/dev/null || true
    cd /
fi

rm -rf "$INSTALL_DIR"

log "Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt update
apt upgrade -y

log "Instalando dependências..."
apt install -y curl wget git nodejs npm nginx certbot python3-certbot-nginx ufw

log "Instalando Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

log "Clonando código..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
git clone "$REPO_URL" .

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

cat > docker-compose.yml << 'EOF'
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

# Dependências de sistema
RUN apk add --no-cache python3 make g++ curl

# Copiar arquivos
COPY package*.json ./
COPY . .

# Instalar e buildar
RUN npm install --production --no-audit --no-fund
RUN npm run build || echo "Build falhou - usando fonte"

# Diretórios
RUN mkdir -p uploads logs tmp

# Usuário
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start command
CMD ["sh", "-c", "if [ -f build/server-simple.js ]; then node build/server-simple.js; else npm start; fi"]
EOF

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

nginx -t
systemctl enable nginx
systemctl start nginx

log "Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

log "Iniciando aplicação..."
docker-compose up -d --build

log "Aguardando inicialização..."
sleep 60

log "Configurando SSL..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email || log "Configure SSL manualmente"

log "Verificando aplicação..."
for i in 1 2 3 4 5; do
    if curl -sf "http://localhost:5000/health" >/dev/null 2>&1; then
        log "N.Crisis funcionando!"
        break
    fi
    log "Tentativa $i/5..."
    sleep 30
done

docker-compose ps

echo
echo "============================================"
echo "         INSTALAÇÃO CONCLUÍDA"
echo "============================================"
echo
echo "URL: https://${DOMAIN}"
echo "Diretório: ${INSTALL_DIR}"
echo
echo "Comandos:"
echo "  Status:  cd ${INSTALL_DIR} && docker-compose ps"
echo "  Logs:    cd ${INSTALL_DIR} && docker-compose logs -f"
echo "  Restart: cd ${INSTALL_DIR} && docker-compose restart"
echo
if [ -z "$OPENAI_KEY" ]; then
    echo "Configure OpenAI: nano ${INSTALL_DIR}/.env"
    echo "Reinicie: cd ${INSTALL_DIR} && docker-compose restart"
fi
echo "============================================"

log "Instalação concluída!"
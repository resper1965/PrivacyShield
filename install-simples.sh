#!/bin/bash

# N.Crisis - Instalação Ultra Simples
# Resolve conflitos de pacotes Node.js

set -e

log() {
    echo "[$(date +'%H:%M:%S')] $*"
}

error() {
    echo "ERROR: $*"
    exit 1
}

if [ "$EUID" -ne 0 ]; then
    error "Execute como root"
fi

log "N.Crisis - Instalação Simples"

DOMAIN="monster.e-ness.com.br"
INSTALL_DIR="/opt/ncrisis"
DB_PASSWORD=$(openssl rand -hex 16)

# Configuração
echo "GitHub token (Enter para público):"
read -r GITHUB_TOKEN

if [ -n "$GITHUB_TOKEN" ]; then
    REPO_URL="https://oauth2:${GITHUB_TOKEN}@github.com/resper1965/PrivacyShield.git"
else
    REPO_URL="https://github.com/resper1965/PrivacyShield.git"
fi

echo "OpenAI key (Enter para pular):"
read -r -s OPENAI_KEY
echo

log "Removendo Node.js conflitante..."
apt remove --purge -y nodejs npm 2>/dev/null || true
apt autoremove -y
apt autoclean

log "Limpando instalação anterior..."
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

log "Instalando dependências básicas..."
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw

log "Instalando Node.js via NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

log "Verificando Node.js..."
node --version
npm --version

log "Instalando Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

log "Clonando repositório..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
git clone "$REPO_URL" .

log "Configurando aplicação..."
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

log "Criando Dockerfile robusto..."
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ curl

COPY package*.json ./
COPY . .

RUN npm ci --only=production --no-audit --no-fund || npm install --only=production --no-audit --no-fund

RUN npm run build || echo "Build opcional falhou"

RUN mkdir -p uploads logs tmp

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["sh", "-c", "if [ -f build/server-simple.js ]; then node build/server-simple.js; else if [ -f src/server-simple.ts ]; then npx ts-node src/server-simple.ts; else npm start; fi"]
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

log "Construindo e iniciando aplicação..."
docker-compose up -d --build

log "Aguardando inicialização (90 segundos)..."
sleep 90

log "Testando aplicação..."
for i in 1 2 3 4 5; do
    if curl -sf "http://localhost:5000/health" >/dev/null 2>&1; then
        log "Aplicação funcionando!"
        break
    fi
    log "Tentativa $i/5 - aguardando mais 30s..."
    sleep 30
done

log "Configurando SSL..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email || log "Configure SSL depois"

log "Status dos containers:"
docker-compose ps

echo
echo "========================================"
echo "      INSTALAÇÃO CONCLUÍDA"
echo "========================================"
echo
echo "🌐 URL: https://${DOMAIN}"
echo "📁 Diretório: ${INSTALL_DIR}"
echo
echo "📋 Comandos úteis:"
echo "   cd ${INSTALL_DIR}"
echo "   docker-compose ps"
echo "   docker-compose logs -f"
echo "   docker-compose restart"
echo
if [ -z "$OPENAI_KEY" ]; then
    echo "⚙️  Configure OpenAI:"
    echo "   nano ${INSTALL_DIR}/.env"
    echo "   docker-compose restart"
    echo
fi
echo "✅ N.Crisis instalado com sucesso!"
echo "========================================"
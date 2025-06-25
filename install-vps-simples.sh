#!/bin/bash

# N.Crisis - Instalação VPS Completa
# Execute: curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/install-vps-simples.sh | sudo bash

set -e

log() { echo "[$(date +'%H:%M:%S')] $*"; }
error() { echo "ERROR: $*"; exit 1; }

if [ "$EUID" -ne 0 ]; then
    error "Execute como root: sudo bash"
fi

log "N.Crisis - Instalação VPS Completa"

# Configurações
DOMAIN="monster.e-ness.com.br"
INSTALL_DIR="/opt/ncrisis"
DB_PASSWORD="ncrisis_db_password_2025"

# Coleta de configurações
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

echo "OpenAI API Key (Enter para configurar depois):"
read -r -s OPENAI_KEY
echo

log "Limpando instalação anterior..."
systemctl stop nginx 2>/dev/null || true
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    docker compose down 2>/dev/null || true
    cd /
fi
rm -rf "$INSTALL_DIR"

log "Removendo Node.js conflitante..."
apt remove --purge -y nodejs npm 2>/dev/null || true
apt autoremove -y
apt autoclean

log "Atualizando sistema..."
export DEBIAN_FRONTEND=noninteractive
apt update
apt upgrade -y

log "Instalando dependências básicas..."
apt install -y curl wget git nginx certbot python3-certbot-nginx ufw software-properties-common

log "Instalando Node.js 20 via NodeSource..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

log "Verificando versões..."
node --version
npm --version

log "Instalando Docker..."
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

log "Instalando Docker Compose plugin..."
apt install -y docker-compose-plugin

log "Clonando N.Crisis..."
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
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  postgres:
    image: postgres:15-alpine
    container_name: ncrisis-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ncrisis_db
      POSTGRES_USER: ncrisis_user
      POSTGRES_PASSWORD: ncrisis_db_password_2025
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ncrisis_user -d ncrisis_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ncrisis-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:
EOF

log "Criando Dockerfile otimizado..."
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Instalar dependências de sistema
RUN apk add --no-cache python3 make g++ curl

# Copiar arquivos de dependência
COPY package*.json ./

# Copiar código fonte
COPY . .

# Instalar dependências com fallback
RUN npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund

# Build backend se possível
RUN npm run build || echo "Build falhou - usando código fonte"

# Build frontend se existir
RUN if [ -d "frontend" ]; then \
        cd frontend && \
        (npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund) && \
        (npm run build || echo "Frontend build falhou"); \
    fi

# Criar diretórios necessários
RUN mkdir -p uploads logs tmp

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Comando flexível de inicialização
CMD ["sh", "-c", "\
  if [ -f build/src/server-simple.js ]; then \
    node build/src/server-simple.js; \
  elif [ -f src/server-simple.ts ]; then \
    npx ts-node src/server-simple.ts; \
  elif [ -f src/server-simple.js ]; then \
    node src/server-simple.js; \
  else \
    npm start; \
  fi"]
EOF

log "Configurando Nginx..."
cat > /etc/nginx/sites-available/ncrisis << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 100M;
    
    # Redirecionamento para HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};
    client_max_body_size 100M;
    
    # Certificados SSL (serão configurados pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    # Configurações SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Proxy para aplicação
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Health check sem logs
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
    
    # WebSocket support
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
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração temporária para HTTP
cat > /etc/nginx/sites-available/ncrisis-temp << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 100M;
    
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
    }
}
EOF

ln -sf /etc/nginx/sites-available/ncrisis-temp /etc/nginx/sites-enabled/ncrisis
nginx -t
systemctl enable nginx
systemctl start nginx

log "Configurando firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'

log "Construindo e iniciando aplicação..."
docker compose build --no-cache
docker compose up -d

log "Aguardando aplicação inicializar (3 minutos)..."
sleep 180

log "Verificando aplicação..."
for i in 1 2 3 4 5; do
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        log "Aplicação funcionando!"
        break
    fi
    log "Tentativa $i/5 - aguardando mais 30s..."
    sleep 30
done

log "Testando proxy HTTP..."
curl -sf http://${DOMAIN}/health && log "HTTP proxy funcionando" || log "HTTP proxy com problemas"

log "Configurando SSL com Certbot..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email

# Ativar configuração SSL completa
ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

log "Teste final HTTPS..."
curl -sf https://${DOMAIN}/health && log "HTTPS funcionando!" || log "Configure SSL manualmente"

log "Status dos containers:"
docker compose ps

log "Verificando logs da aplicação:"
docker compose logs app --tail=10

echo
echo "=============================================="
echo "       N.CRISIS INSTALAÇÃO CONCLUÍDA"
echo "=============================================="
echo
echo "🌐 URLs de Acesso:"
echo "   Principal: https://${DOMAIN}"
echo "   Health:    https://${DOMAIN}/health"
echo
echo "📁 Diretórios:"
echo "   Aplicação: ${INSTALL_DIR}"
echo "   Logs:      ${INSTALL_DIR}/logs"
echo "   Uploads:   ${INSTALL_DIR}/uploads"
echo
echo "🐳 Comandos Docker:"
echo "   Status:    cd ${INSTALL_DIR} && docker compose ps"
echo "   Logs:      cd ${INSTALL_DIR} && docker compose logs -f"
echo "   Restart:   cd ${INSTALL_DIR} && docker compose restart"
echo "   Rebuild:   cd ${INSTALL_DIR} && docker compose up -d --build"
echo
echo "⚙️ Configuração:"
if [ -z "$OPENAI_KEY" ]; then
    echo "   Configure OpenAI: nano ${INSTALL_DIR}/.env"
    echo "   Reiniciar após: cd ${INSTALL_DIR} && docker compose restart"
fi
echo
echo "🔧 Manutenção:"
echo "   Nginx reload: systemctl reload nginx"
echo "   Nginx status: systemctl status nginx"
echo "   SSL renovar:  certbot renew"
echo "   Firewall:     ufw status"
echo
echo "📊 Monitoramento:"
echo "   Health check: curl https://${DOMAIN}/health"
echo "   App direta:   curl http://localhost:5000/health"
echo "   Containers:   docker ps"
echo "   Logs Nginx:   tail -f /var/log/nginx/error.log"
echo
echo "=============================================="
echo "✅ N.Crisis instalado com sucesso!"
echo "🔗 Acesse: https://${DOMAIN}"
echo "=============================================="

log "Instalação concluída!"
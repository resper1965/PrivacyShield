#!/bin/bash

#==============================================================================
# N.Crisis - Instalação Completa (Repositório Privado)
# Ubuntu 22.04 LTS - Instalação do Zero com Docker
# Suporte para múltiplas instâncias (N8N, outros serviços)
#==============================================================================

set -euo pipefail

# Configurações
readonly DOMAIN="monster.e-ness.com.br"
readonly BASE_DIR="/opt"
readonly NCRISIS_DIR="${BASE_DIR}/ncrisis"
readonly N8N_DIR="${BASE_DIR}/n8n"
readonly LOG_FILE="/var/log/ncrisis-install.log"

# Cores para output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Logging
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $*"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $*"; exit 1; }
info() { echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $*"; }

# Verificações iniciais
check_requirements() {
    [[ $EUID -eq 0 ]] || error "Execute como root: sudo bash install-private.sh"
    [[ -f /etc/os-release ]] || error "Sistema não suportado"
    
    source /etc/os-release
    [[ "$ID" == "ubuntu" ]] || error "Apenas Ubuntu é suportado"
    [[ "$VERSION_ID" == "22.04" ]] || warn "Testado apenas no Ubuntu 22.04"
    
    log "Sistema Ubuntu $VERSION_ID detectado"
}

# Coleta de configurações
collect_config() {
    info "Configure as variáveis necessárias:"
    
    read -p "GitHub Personal Access Token: " -s GITHUB_TOKEN
    echo
    [[ -n "$GITHUB_TOKEN" ]] || error "GitHub token é obrigatório para repositório privado"
    
    read -p "OpenAI API Key (opcional): " -s OPENAI_KEY
    echo
    read -p "SendGrid API Key (opcional): " -s SENDGRID_KEY
    echo
    read -p "Email para SSL (padrão: admin@e-ness.com.br): " SSL_EMAIL
    SSL_EMAIL=${SSL_EMAIL:-admin@e-ness.com.br}
    
    # Perguntar sobre N8N
    read -p "Instalar N8N? (y/n): " INSTALL_N8N
    
    # Gerar senhas
    readonly DB_PASSWORD=$(openssl rand -hex 16)
    readonly REDIS_PASSWORD=$(openssl rand -hex 12)
    readonly N8N_ENCRYPTION_KEY=$(openssl rand -hex 16)
    
    log "Configurações coletadas"
}

# Limpeza de sistema
system_cleanup() {
    log "Limpando sistema anterior..."
    
    # Parar serviços
    systemctl stop ncrisis 2>/dev/null || true
    systemctl stop n8n 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    
    # Parar containers
    cd "$NCRISIS_DIR" 2>/dev/null && docker-compose down 2>/dev/null || true
    cd "$N8N_DIR" 2>/dev/null && docker-compose down 2>/dev/null || true
    
    # Remover diretórios (preservar dados se existirem)
    if [[ -d "$NCRISIS_DIR" ]]; then
        mv "$NCRISIS_DIR" "${NCRISIS_DIR}.backup.$(date +%s)" 2>/dev/null || rm -rf "$NCRISIS_DIR"
    fi
    
    rm -f /etc/systemd/system/ncrisis.service
    rm -f /etc/systemd/system/n8n.service
    rm -f /etc/nginx/sites-*/ncrisis
    rm -f /etc/nginx/sites-*/n8n
    
    # Limpeza APT
    rm -f /etc/apt/sources.list.d/ubuntu-mirrors.list
    rm -rf /var/lib/apt/lists/*
    apt clean
    
    log "Limpeza concluída"
}

# Instalação de dependências
install_dependencies() {
    log "Atualizando sistema..."
    export DEBIAN_FRONTEND=noninteractive
    apt update
    apt upgrade -y
    
    log "Instalando dependências básicas..."
    apt install -y \
        curl wget git unzip \
        software-properties-common \
        ca-certificates gnupg lsb-release \
        ufw fail2ban htop jq \
        build-essential

    log "Instalando Docker..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    log "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    
    log "Instalando Nginx..."
    apt install -y nginx certbot python3-certbot-nginx
    
    systemctl enable docker nginx
    systemctl start docker nginx
    
    log "Dependências instaladas"
}

# Clonagem do repositório N.Crisis
clone_ncrisis() {
    log "Clonando N.Crisis..."
    
    mkdir -p "$NCRISIS_DIR"
    cd "$NCRISIS_DIR"
    
    # Clone usando token oauth2
    git clone "https://oauth2:${GITHUB_TOKEN}@github.com/resper1965/PrivacyShield.git" .
    
    log "N.Crisis clonado em: $NCRISIS_DIR"
}

# Configuração do N.Crisis
setup_ncrisis() {
    log "Configurando N.Crisis..."
    
    cd "$NCRISIS_DIR"
    
    # Arquivo .env
    cat > .env << EOF
# N.Crisis Production Environment
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://ncrisis_user:${DB_PASSWORD}@localhost:5432/ncrisis_db

# Redis
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379/0

# APIs
OPENAI_API_KEY=${OPENAI_KEY:-sk-configure-your-key}
SENDGRID_API_KEY=${SENDGRID_KEY:-SG.configure-your-key}

# Domain
DOMAIN=${DOMAIN}
CORS_ORIGINS=https://${DOMAIN},https://n8n.${DOMAIN},http://localhost:5000

# Security
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

# N8N Integration
N8N_WEBHOOK_URL=https://n8n.${DOMAIN}/webhook/ncrisis

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=

# File Processing
MAX_FILE_SIZE=100MB
UPLOAD_DIR=${NCRISIS_DIR}/uploads
TEMP_DIR=${NCRISIS_DIR}/tmp
EOF

    # Docker Compose para N.Crisis
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ncrisis-app
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
      - ./tmp:/app/tmp
    depends_on:
      - postgres
      - redis
      - clamav
    networks:
      - ncrisis-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:15-alpine
    container_name: ncrisis-postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ncrisis_db
      POSTGRES_USER: ncrisis_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - ncrisis-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ncrisis_user -d ncrisis_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ncrisis-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - ncrisis-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  clamav:
    image: clamav/clamav:latest
    container_name: ncrisis-clamav
    restart: unless-stopped
    volumes:
      - clamav_data:/var/lib/clamav
    networks:
      - ncrisis-network
    healthcheck:
      test: ["CMD", "clamdscan", "--ping"]
      interval: 60s
      timeout: 30s
      retries: 3
      start_period: 300s

volumes:
  postgres_data:
  redis_data:
  clamav_data:

networks:
  ncrisis-network:
    driver: bridge
EOF

    # Dockerfile otimizado
    cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
COPY frontend/package*.json ./frontend/

RUN npm ci --only=production --no-audit --no-fund
RUN cd frontend && npm ci --only=production --no-audit --no-fund

COPY . .

RUN npm run build
RUN cd frontend && npm run build

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY --from=builder /app/build ./build
COPY --from=builder /app/frontend/dist ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

RUN mkdir -p uploads logs tmp

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["node", "build/server-simple.js"]
EOF

    log "N.Crisis configurado"
}

# Instalação N8N (se solicitado)
setup_n8n() {
    if [[ "$INSTALL_N8N" != "y" ]]; then
        return
    fi
    
    log "Configurando N8N..."
    
    mkdir -p "$N8N_DIR"
    cd "$N8N_DIR"
    
    # Docker Compose para N8N
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
      - N8N_BASIC_AUTH_PASSWORD=$(openssl rand -hex 8)
      - N8N_HOST=n8n.${DOMAIN}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.${DOMAIN}/
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n_user
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    networks:
      - n8n-network

  postgres:
    image: postgres:15-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - n8n_postgres_data:/var/lib/postgresql/data
    networks:
      - n8n-network

volumes:
  n8n_data:
  n8n_postgres_data:

networks:
  n8n-network:
    driver: bridge
EOF

    log "N8N configurado em: $N8N_DIR"
}

# Instalação de dependências da aplicação
install_app_dependencies() {
    log "Instalando dependências da aplicação..."
    
    cd "$NCRISIS_DIR"
    
    # Backend
    npm ci --only=production --no-audit --no-fund
    
    # Frontend
    cd frontend
    npm ci --only=production --no-audit --no-fund
    npm run build
    cd ..
    
    # Build backend
    npm run build
    
    log "Dependências da aplicação instaladas"
}

# Configuração do banco de dados
setup_database() {
    log "Configurando banco de dados..."
    
    cd "$NCRISIS_DIR"
    
    # Script de inicialização
    cat > init.sql << 'EOF'
-- N.Crisis Database Initialization
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Performance tuning
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET work_mem = '4MB';
EOF

    log "Banco de dados configurado"
}

# Configuração do Nginx
setup_nginx() {
    log "Configurando Nginx..."
    
    # Configuração N.Crisis
    cat > /etc/nginx/sites-available/ncrisis << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /static {
        alias ${NCRISIS_DIR}/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
EOF

    # Configuração N8N (se instalado)
    if [[ "$INSTALL_N8N" == "y" ]]; then
        cat > /etc/nginx/sites-available/n8n << EOF
server {
    listen 80;
    server_name n8n.${DOMAIN};

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:5678;
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
        ln -sf /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
    fi

    # Ativar N.Crisis
    ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t || error "Erro na configuração do Nginx"
    
    log "Nginx configurado"
}

# Configuração de segurança
setup_security() {
    log "Configurando segurança..."
    
    # Firewall
    ufw --force enable
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'
    
    # Fail2ban
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
EOF

    systemctl enable fail2ban
    systemctl restart fail2ban
    
    log "Segurança configurada"
}

# Inicialização dos serviços
start_services() {
    log "Iniciando serviços..."
    
    # N.Crisis
    cd "$NCRISIS_DIR"
    docker-compose up -d
    
    # N8N
    if [[ "$INSTALL_N8N" == "y" ]]; then
        cd "$N8N_DIR"
        docker-compose up -d
    fi
    
    sleep 30
    
    # Nginx
    systemctl restart nginx
    
    log "Serviços iniciados"
}

# Configuração SSL
setup_ssl() {
    log "Configurando SSL..."
    
    # N.Crisis
    certbot --nginx -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$SSL_EMAIL" \
        --no-eff-email || warn "Falha na configuração SSL para N.Crisis"
    
    # N8N
    if [[ "$INSTALL_N8N" == "y" ]]; then
        certbot --nginx -d "n8n.$DOMAIN" \
            --non-interactive \
            --agree-tos \
            --email "$SSL_EMAIL" \
            --no-eff-email || warn "Falha na configuração SSL para N8N"
    fi
    
    # Auto-renovação
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log "SSL configurado"
}

# Verificação final
verify_installation() {
    log "Verificando instalação..."
    
    # N.Crisis
    cd "$NCRISIS_DIR"
    if ! docker-compose ps | grep -q "Up"; then
        warn "Containers N.Crisis com problema"
    fi
    
    sleep 10
    if ! curl -sf "http://localhost:5000/health" >/dev/null; then
        warn "API N.Crisis não está respondendo"
    fi
    
    # N8N
    if [[ "$INSTALL_N8N" == "y" ]]; then
        cd "$N8N_DIR"
        if ! docker-compose ps | grep -q "Up"; then
            warn "Containers N8N com problema"
        fi
        
        if ! curl -sf "http://localhost:5678" >/dev/null; then
            warn "N8N não está respondendo"
        fi
    fi
    
    # Nginx
    if ! systemctl is-active --quiet nginx; then
        error "Nginx não está executando"
    fi
    
    log "✓ Verificação concluída"
}

# Relatório final
final_report() {
    echo
    echo "======================================================================"
    echo "               N.CRISIS INSTALAÇÃO CONCLUÍDA"
    echo "======================================================================"
    echo
    echo "📍 DIRETÓRIOS DE INSTALAÇÃO:"
    echo "   N.Crisis: ${NCRISIS_DIR}"
    if [[ "$INSTALL_N8N" == "y" ]]; then
        echo "   N8N:      ${N8N_DIR}"
    fi
    echo "   Logs:     ${LOG_FILE}"
    echo
    echo "🌐 URLs:"
    echo "   N.Crisis: https://${DOMAIN}"
    if [[ "$INSTALL_N8N" == "y" ]]; then
        echo "   N8N:      https://n8n.${DOMAIN}"
    fi
    echo
    echo "🐳 COMANDOS DOCKER:"
    echo "   N.Crisis Status:  cd ${NCRISIS_DIR} && docker-compose ps"
    echo "   N.Crisis Logs:    cd ${NCRISIS_DIR} && docker-compose logs -f"
    echo "   N.Crisis Restart: cd ${NCRISIS_DIR} && docker-compose restart"
    if [[ "$INSTALL_N8N" == "y" ]]; then
        echo "   N8N Status:       cd ${N8N_DIR} && docker-compose ps"
        echo "   N8N Logs:         cd ${N8N_DIR} && docker-compose logs -f"
        echo "   N8N Restart:      cd ${N8N_DIR} && docker-compose restart"
    fi
    echo
    echo "⚙️ CONFIGURAÇÃO PÓS-INSTALAÇÃO:"
    if [[ -z "$OPENAI_KEY" ]]; then
        echo "   1. Configure OpenAI: nano ${NCRISIS_DIR}/.env"
    fi
    if [[ -z "$SENDGRID_KEY" ]]; then
        echo "   2. Configure SendGrid: nano ${NCRISIS_DIR}/.env"
    fi
    echo "   3. Reiniciar: cd ${NCRISIS_DIR} && docker-compose restart"
    echo
    echo "🔍 MONITORAMENTO:"
    echo "   Health N.Crisis: curl https://${DOMAIN}/health"
    if [[ "$INSTALL_N8N" == "y" ]]; then
        echo "   Health N8N:      curl https://n8n.${DOMAIN}"
    fi
    echo "   Nginx Status:    systemctl status nginx"
    echo "   Firewall:        ufw status"
    echo
    echo "📊 INTEGRAÇÕES:"
    echo "   - N.Crisis rodando na porta 5000"
    if [[ "$INSTALL_N8N" == "y" ]]; then
        echo "   - N8N rodando na porta 5678"
        echo "   - PostgreSQL compartilhado entre serviços"
        echo "   - Redis dedicado para N.Crisis"
    fi
    echo "   - ClamAV para scan de vírus"
    echo "   - SSL configurado automaticamente"
    echo
    echo "======================================================================"
}

# Função principal
main() {
    log "Iniciando instalação N.Crisis (repositório privado)..."
    
    check_requirements
    collect_config
    system_cleanup
    install_dependencies
    clone_ncrisis
    setup_ncrisis
    setup_n8n
    install_app_dependencies
    setup_database
    setup_nginx
    setup_security
    start_services
    setup_ssl
    verify_installation
    final_report
    
    log "Instalação concluída com sucesso!"
}

# Trap para limpeza em caso de erro
trap 'error "Instalação interrompida"' ERR

# Executar
main "$@"
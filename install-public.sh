#!/bin/bash

#==============================================================================
# N.Crisis - Instalação Completa (Repositório Público)
# Ubuntu 22.04 LTS - Instalação do Zero com Docker
#==============================================================================

set -euo pipefail

# Configurações
readonly DOMAIN="monster.e-ness.com.br"
readonly INSTALL_DIR="/opt/ncrisis"
readonly LOG_FILE="/var/log/ncrisis-install.log"
readonly GITHUB_REPO="https://github.com/resper1965/PrivacyShield.git"

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
    [[ $EUID -eq 0 ]] || error "Execute como root: sudo bash install-public.sh"
    [[ -f /etc/os-release ]] || error "Sistema não suportado"
    
    source /etc/os-release
    [[ "$ID" == "ubuntu" ]] || error "Apenas Ubuntu é suportado"
    [[ "$VERSION_ID" == "22.04" ]] || warn "Testado apenas no Ubuntu 22.04"
    
    log "Sistema Ubuntu $VERSION_ID detectado"
}

# Coleta de configurações
collect_config() {
    info "Configure as variáveis necessárias:"
    
    read -p "OpenAI API Key (opcional): " -s OPENAI_KEY
    echo
    read -p "SendGrid API Key (opcional): " -s SENDGRID_KEY
    echo
    read -p "Email para SSL (padrão: admin@e-ness.com.br): " SSL_EMAIL
    SSL_EMAIL=${SSL_EMAIL:-admin@e-ness.com.br}
    
    # Gerar senhas
    readonly DB_PASSWORD=$(openssl rand -hex 16)
    readonly REDIS_PASSWORD=$(openssl rand -hex 12)
    
    log "Configurações coletadas"
}

# Limpeza de sistema
system_cleanup() {
    log "Limpando sistema anterior..."
    
    # Parar serviços
    systemctl stop ncrisis 2>/dev/null || true
    systemctl stop nginx 2>/dev/null || true
    docker-compose -f "$INSTALL_DIR/docker-compose.yml" down 2>/dev/null || true
    
    # Remover diretórios
    rm -rf "$INSTALL_DIR"
    rm -f /etc/systemd/system/ncrisis.service
    rm -f /etc/nginx/sites-*/ncrisis
    
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

# Clonagem do repositório
clone_repository() {
    log "Clonando repositório..."
    
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    git clone "$GITHUB_REPO" .
    
    log "Repositório clonado"
}

# Configuração do ambiente
setup_environment() {
    log "Configurando ambiente..."
    
    cd "$INSTALL_DIR"
    
    # Arquivo .env principal
    cat > .env << EOF
# N.Crisis Production Environment
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://ncrisis_user:${DB_PASSWORD}@postgres:5432/ncrisis_db

# Redis
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# APIs
OPENAI_API_KEY=${OPENAI_KEY:-sk-configure-your-key}
SENDGRID_API_KEY=${SENDGRID_KEY:-SG.configure-your-key}

# Domain
DOMAIN=${DOMAIN}
CORS_ORIGINS=https://${DOMAIN},http://localhost:5000

# Security
JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=

# File Processing
MAX_FILE_SIZE=100MB
UPLOAD_DIR=/app/uploads
TEMP_DIR=/app/tmp

# ClamAV
CLAMAV_HOST=clamav
CLAMAV_PORT=3310
EOF

    # Docker Compose Production
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
    command: redis-server --requirepass ${REDIS_PASSWORD}
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

# Instalar dependências de build
RUN apk add --no-cache python3 make g++ git

# Copiar package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Instalar dependências
RUN npm ci --only=production --no-audit --no-fund
RUN cd frontend && npm ci --only=production --no-audit --no-fund

# Copiar código fonte
COPY . .

# Build da aplicação
RUN npm run build
RUN cd frontend && npm run build

# Produção
FROM node:20-alpine

WORKDIR /app

# Instalar dependências de runtime
RUN apk add --no-cache curl

# Copiar aplicação buildada
COPY --from=builder /app/build ./build
COPY --from=builder /app/frontend/dist ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Criar diretórios
RUN mkdir -p uploads logs tmp

# Usuário não-root
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

# Porta
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Comando de start
CMD ["node", "build/server-simple.js"]
EOF

    log "Ambiente configurado"
}

# Instalação de dependências da aplicação
install_app_dependencies() {
    log "Instalando dependências da aplicação..."
    
    cd "$INSTALL_DIR"
    
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
    
    cd "$INSTALL_DIR"
    
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
    
    # Configuração principal
    cat > /etc/nginx/sites-available/ncrisis << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # File upload limit
    client_max_body_size 100M;

    # Proxy para aplicação
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

    # Static files
    location /static {
        alias /opt/ncrisis/public;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5000/health;
        access_log off;
    }
}
EOF

    # Ativar site
    ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Testar configuração
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
    
    cd "$INSTALL_DIR"
    
    # Docker Compose
    docker-compose up -d
    
    # Aguardar inicialização
    sleep 30
    
    # Verificar saúde dos containers
    docker-compose ps
    
    # Nginx
    systemctl restart nginx
    
    log "Serviços iniciados"
}

# Configuração SSL
setup_ssl() {
    log "Configurando SSL..."
    
    # Certbot para SSL
    certbot --nginx -d "$DOMAIN" \
        --non-interactive \
        --agree-tos \
        --email "$SSL_EMAIL" \
        --no-eff-email || warn "Falha na configuração SSL - configure manualmente"
    
    # Auto-renovação
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    
    log "SSL configurado"
}

# Verificação final
verify_installation() {
    log "Verificando instalação..."
    
    # Verificar containers
    if ! docker-compose ps | grep -q "Up"; then
        error "Containers não estão executando"
    fi
    
    # Verificar API
    sleep 10
    if ! curl -sf "http://localhost:5000/health" >/dev/null; then
        warn "API não está respondendo - verifique logs"
    fi
    
    # Verificar Nginx
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
    echo "🌐 URL: https://${DOMAIN}"
    echo "📁 Diretório: ${INSTALL_DIR}"
    echo "📄 Logs: ${LOG_FILE}"
    echo
    echo "COMANDOS ÚTEIS:"
    echo "  Status:     cd ${INSTALL_DIR} && docker-compose ps"
    echo "  Logs:       cd ${INSTALL_DIR} && docker-compose logs -f"
    echo "  Restart:    cd ${INSTALL_DIR} && docker-compose restart"
    echo "  Stop:       cd ${INSTALL_DIR} && docker-compose down"
    echo "  Start:      cd ${INSTALL_DIR} && docker-compose up -d"
    echo
    echo "CONFIGURAÇÃO PÓS-INSTALAÇÃO:"
    if [[ -z "$OPENAI_KEY" ]]; then
        echo "  1. Configure OpenAI: nano ${INSTALL_DIR}/.env"
    fi
    if [[ -z "$SENDGRID_KEY" ]]; then
        echo "  2. Configure SendGrid: nano ${INSTALL_DIR}/.env"
    fi
    echo "  3. Reiniciar após configurar: cd ${INSTALL_DIR} && docker-compose restart"
    echo
    echo "MONITORAMENTO:"
    echo "  Health Check: curl https://${DOMAIN}/health"
    echo "  Nginx Status: systemctl status nginx"
    echo "  Firewall:     ufw status"
    echo
    echo "======================================================================"
}

# Função principal
main() {
    log "Iniciando instalação N.Crisis..."
    
    check_requirements
    collect_config
    system_cleanup
    install_dependencies
    clone_repository
    setup_environment
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
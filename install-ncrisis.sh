#!/bin/bash

# =================================================================
# N.Crisis - Complete Production Installation Script
# Sistema PII Detection & LGPD com funcionalidades AI completas
# =================================================================
# Uso: ./install-ncrisis.sh [--update] [--backup] [--force]
# Suporte: Ubuntu 22.04/20.04, CentOS 8+, RHEL 8+
# =================================================================

set -euo pipefail

# =================================================================
# CONFIGURAÇÕES GLOBAIS
# =================================================================

# Versão e metadados
readonly SCRIPT_VERSION="2.1.0"
readonly NCRISIS_DIR="/opt/ncrisis"
readonly BACKUP_DIR="/opt/backups/ncrisis"
readonly LOG_FILE="/var/log/ncrisis-install.log"
readonly CONFIG_FILE="/etc/ncrisis/config"
readonly DOMAIN="${NCRISIS_DOMAIN:-monster.e-ness.com.br}"

# Senhas e configurações
readonly DB_PASSWORD="${NCRISIS_DB_PASSWORD:-$(openssl rand -hex 16)}"
readonly DB_USER="ncrisis_user"
readonly DB_NAME="ncrisis_db"

# Flags de controle
UPDATE_MODE=false
BACKUP_MODE=false
FORCE_MODE=false
SKIP_SSL=false

# Distribuição detectada
DISTRO=""
DISTRO_VERSION=""

# =================================================================
# CORES E UTILITÁRIOS
# =================================================================

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'

# Função de logging avançada
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "${GREEN}[INFO]${NC}  [$timestamp] $message" | tee -a "$LOG_FILE" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC}  [$timestamp] $message" | tee -a "$LOG_FILE" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} [$timestamp] $message" | tee -a "$LOG_FILE" ;;
        "DEBUG") echo -e "${CYAN}[DEBUG]${NC} [$timestamp] $message" | tee -a "$LOG_FILE" ;;
        "STEP")  echo -e "${PURPLE}[STEP]${NC}  [$timestamp] $message" | tee -a "$LOG_FILE" ;;
        *)       echo -e "${BLUE}[LOG]${NC}   [$timestamp] $message" | tee -a "$LOG_FILE" ;;
    esac
}

# Função de erro com cleanup
error_exit() {
    log "ERROR" "$1"
    
    # Cleanup em caso de erro
    if [[ -n "${TEMP_DIR:-}" && -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
    
    # Parar serviços se estiverem rodando parcialmente
    systemctl stop ncrisis 2>/dev/null || true
    
    log "ERROR" "Instalação falhou. Verifique logs em $LOG_FILE"
    exit 1
}

# Trap para cleanup
trap 'error_exit "Instalação interrompida por sinal"' INT TERM

# Função de retry para comandos críticos
retry() {
    local max_attempts="$1"
    local delay="$2"
    shift 2
    local cmd="$*"
    local attempt=1
    
    while (( attempt <= max_attempts )); do
        if eval "$cmd"; then
            return 0
        fi
        
        log "WARN" "Tentativa $attempt/$max_attempts falhou: $cmd"
        if (( attempt < max_attempts )); then
            log "INFO" "Aguardando ${delay}s antes da próxima tentativa..."
            sleep "$delay"
        fi
        ((attempt++))
    done
    
    error_exit "Comando falhou após $max_attempts tentativas: $cmd"
}

# =================================================================
# DETECÇÃO DE SISTEMA
# =================================================================

detect_system() {
    log "STEP" "Detectando sistema operacional..."
    
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        DISTRO="$ID"
        DISTRO_VERSION="$VERSION_ID"
    elif [[ -f /etc/redhat-release ]]; then
        DISTRO="rhel"
        DISTRO_VERSION=$(grep -oE '[0-9]+\.[0-9]+' /etc/redhat-release | head -1)
    else
        error_exit "Sistema operacional não suportado"
    fi
    
    log "INFO" "Sistema detectado: $DISTRO $DISTRO_VERSION"
    
    # Verificar versões suportadas
    case "$DISTRO" in
        "ubuntu")
            if [[ ! "$DISTRO_VERSION" =~ ^(20\.04|22\.04|24\.04)$ ]]; then
                log "WARN" "Versão Ubuntu $DISTRO_VERSION pode não ser totalmente suportada"
            fi
            ;;
        "centos"|"rhel"|"rocky"|"almalinux")
            if (( $(echo "$DISTRO_VERSION >= 8" | bc -l) != 1 )); then
                log "WARN" "Versão $DISTRO $DISTRO_VERSION pode não ser totalmente suportada"
            fi
            ;;
        *)
            log "WARN" "Distribuição $DISTRO pode não ser totalmente suportada"
            ;;
    esac
}

# =================================================================
# VERIFICAÇÕES PRÉ-INSTALAÇÃO
# =================================================================

check_prerequisites() {
    log "STEP" "Verificando pré-requisitos..."
    
    # Verificar se é root
    if [[ $EUID -ne 0 ]]; then
        error_exit "Este script deve ser executado como root"
    fi
    
    # Verificar recursos mínimos
    local ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local ram_gb=$((ram_kb / 1024 / 1024))
    
    if (( ram_gb < 2 )); then
        log "WARN" "RAM disponível: ${ram_gb}GB (recomendado: 4GB+)"
    fi
    
    # Verificar espaço em disco
    local disk_avail=$(df / | awk 'NR==2 {print $4}')
    local disk_gb=$((disk_avail / 1024 / 1024))
    
    if (( disk_gb < 10 )); then
        error_exit "Espaço insuficiente: ${disk_gb}GB (mínimo: 10GB)"
    fi
    
    # Verificar conectividade
    if ! ping -c 1 google.com >/dev/null 2>&1; then
        error_exit "Sem conectividade com a internet"
    fi
    
    # Verificar tokens obrigatórios
    if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
        error_exit "GITHUB_PERSONAL_ACCESS_TOKEN não configurado"
    fi
    
    if [[ -z "${OPENAI_API_KEY:-}" ]]; then
        log "WARN" "OPENAI_API_KEY não configurado - funcionalidades AI serão limitadas"
    fi
    
    log "INFO" "Pré-requisitos verificados com sucesso"
}

# =================================================================
# INSTALAÇÃO DE DEPENDÊNCIAS POR DISTRIBUIÇÃO
# =================================================================

install_base_packages() {
    log "STEP" "Instalando pacotes base..."
    
    case "$DISTRO" in
        "ubuntu"|"debian")
            # Corrigir repositórios duplicados primeiro
            log "INFO" "Corrigindo repositórios APT duplicados..."
            if [[ -f "/etc/apt/sources.list.d/ubuntu-mirrors.list" ]]; then
                rm -f /etc/apt/sources.list.d/ubuntu-mirrors.list
                log "INFO" "Removido arquivo ubuntu-mirrors.list duplicado"
            fi
            rm -rf /var/lib/apt/lists/*
            apt clean
            
            retry 3 5 "apt update"
            retry 3 5 "DEBIAN_FRONTEND=noninteractive apt upgrade -y"
            retry 3 5 "DEBIAN_FRONTEND=noninteractive apt install -y \
                curl wget git build-essential software-properties-common \
                jq htop unzip ufw fail2ban nginx certbot python3-certbot-nginx \
                postgresql postgresql-contrib redis-server clamav clamav-daemon \
                supervisor logrotate rsync bc"
            ;;
        "centos"|"rhel"|"rocky"|"almalinux")
            retry 3 5 "dnf update -y"
            retry 3 5 "dnf install -y epel-release"
            retry 3 5 "dnf install -y \
                curl wget git gcc gcc-c++ make \
                jq htop unzip firewalld fail2ban nginx certbot python3-certbot-nginx \
                postgresql postgresql-server postgresql-contrib redis clamav clamav-update \
                supervisor logrotate rsync bc"
            
            # Inicializar PostgreSQL no RHEL/CentOS
            if [[ ! -d /var/lib/pgsql/data/base ]]; then
                postgresql-setup --initdb
            fi
            ;;
        *)
            error_exit "Distribuição não suportada: $DISTRO"
            ;;
    esac
    
    log "INFO" "Pacotes base instalados"
}

install_nodejs() {
    log "STEP" "Instalando Node.js 20..."
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if (( node_version >= 20 )); then
            log "INFO" "Node.js $node_version já instalado"
            return 0
        else
            log "INFO" "Atualizando Node.js de v$node_version para v20"
        fi
    fi
    
    # Instalar Node.js via NodeSource
    case "$DISTRO" in
        "ubuntu"|"debian")
            retry 3 5 "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -"
            retry 3 5 "apt install -y nodejs"
            ;;
        "centos"|"rhel"|"rocky"|"almalinux")
            retry 3 5 "curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -"
            retry 3 5 "dnf install -y nodejs"
            ;;
    esac
    
    # Verificar instalação
    local node_ver=$(node --version)
    local npm_ver=$(npm --version)
    log "INFO" "Node.js $node_ver e npm $npm_ver instalados"
    
    # Configurar npm para produção
    npm config set fund false
    npm config set audit-level high
}

# =================================================================
# CONFIGURAÇÃO DE SERVIÇOS
# =================================================================

setup_postgresql() {
    log "STEP" "Configurando PostgreSQL..."
    
    # Iniciar serviços
    systemctl enable postgresql
    systemctl start postgresql
    
    # Aguardar PostgreSQL inicializar
    retry 10 2 "systemctl is-active postgresql"
    
    # Criar usuário e banco
    local pg_version=$(sudo -u postgres psql -t -c "SELECT version()" | grep -oE '[0-9]+\.[0-9]+' | head -1)
    log "INFO" "PostgreSQL versão $pg_version detectado"
    
    # Script SQL para configuração
    sudo -u postgres psql << EOF || error_exit "Falha ao configurar PostgreSQL"
-- Remover usuário/banco se existir (modo force)
DO \$\$
BEGIN
    IF EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') THEN
        RAISE NOTICE 'Removendo banco existente: $DB_NAME';
        DROP DATABASE $DB_NAME;
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN
        RAISE NOTICE 'Removendo usuário existente: $DB_USER';
        DROP ROLE $DB_USER;
    END IF;
END
\$\$;

-- Criar usuário e banco
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;

-- Configurações de performance
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;

SELECT pg_reload_conf();
EOF
    
    # Configurar autenticação
    local pg_data_dir="/var/lib/postgresql/data"
    [[ "$DISTRO" =~ (centos|rhel|rocky|almalinux) ]] && pg_data_dir="/var/lib/pgsql/data"
    
    if [[ -f "$pg_data_dir/pg_hba.conf" ]]; then
        # Backup da configuração original
        cp "$pg_data_dir/pg_hba.conf" "$pg_data_dir/pg_hba.conf.backup"
        
        # Adicionar linha de autenticação para nosso usuário
        echo "local   $DB_NAME    $DB_USER                            md5" >> "$pg_data_dir/pg_hba.conf"
        
        systemctl restart postgresql
        retry 10 2 "systemctl is-active postgresql"
    fi
    
    log "INFO" "PostgreSQL configurado (usuário: $DB_USER, banco: $DB_NAME)"
}

setup_redis() {
    log "STEP" "Configurando Redis..."
    
    # Configuração do Redis
    local redis_conf="/etc/redis/redis.conf"
    [[ "$DISTRO" =~ (centos|rhel|rocky|almalinux) ]] && redis_conf="/etc/redis.conf"
    
    if [[ -f "$redis_conf" ]]; then
        # Backup da configuração
        cp "$redis_conf" "${redis_conf}.backup"
        
        # Configurações de produção
        sed -i 's/^# maxmemory .*/maxmemory 256mb/' "$redis_conf"
        sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' "$redis_conf"
        sed -i 's/^supervised no/supervised systemd/' "$redis_conf"
        sed -i 's/^# requirepass .*/requirepass ncrisis_redis_2025/' "$redis_conf"
    fi
    
    systemctl enable redis-server || systemctl enable redis
    systemctl start redis-server || systemctl start redis
    
    # Testar Redis
    retry 5 2 "redis-cli ping" || error_exit "Redis não está respondendo"
    
    log "INFO" "Redis configurado e funcionando"
}

setup_clamav() {
    log "STEP" "Configurando ClamAV..."
    
    # Configuração específica por distribuição
    case "$DISTRO" in
        "ubuntu"|"debian")
            systemctl stop clamav-freshclam || true
            ;;
        "centos"|"rhel"|"rocky"|"almalinux")
            systemctl stop clamav-freshclam || true
            ;;
    esac
    
    # Atualizar definições (com timeout)
    log "INFO" "Atualizando definições de vírus (pode demorar)..."
    timeout 600 freshclam || log "WARN" "Timeout na atualização de definições"
    
    # Iniciar serviços
    systemctl enable clamav-freshclam || systemctl enable clamd@freshclam
    systemctl start clamav-freshclam || systemctl start clamd@freshclam
    systemctl enable clamav-daemon || systemctl enable clamd@scan
    systemctl start clamav-daemon || systemctl start clamd@scan
    
    # Aguardar daemon inicializar
    log "INFO" "Aguardando ClamAV daemon inicializar..."
    sleep 15
    
    # Verificar se está funcionando
    local clamav_status=false
    for i in {1..10}; do
        if systemctl is-active --quiet clamav-daemon || systemctl is-active --quiet clamd@scan; then
            clamav_status=true
            break
        fi
        sleep 5
    done
    
    if [[ "$clamav_status" == "true" ]]; then
        log "INFO" "ClamAV configurado e funcionando"
    else
        log "WARN" "ClamAV pode não estar funcionando - continuando instalação"
    fi
}

# =================================================================
# INSTALAÇÃO DA APLICAÇÃO
# =================================================================

install_application() {
    log "STEP" "Instalando aplicação N.Crisis..."
    
    # Criar diretórios
    mkdir -p "$NCRISIS_DIR" "$BACKUP_DIR" "$(dirname "$CONFIG_FILE")"
    
    # Backup da instalação existente
    if [[ -d "$NCRISIS_DIR" && "$UPDATE_MODE" == "true" ]]; then
        log "INFO" "Fazendo backup da instalação existente..."
        local backup_name="ncrisis-backup-$(date +%Y%m%d-%H%M%S)"
        tar -czf "$BACKUP_DIR/$backup_name.tar.gz" -C "$NCRISIS_DIR" . || true
    fi
    
    # Limpar diretório se force mode
    if [[ "$FORCE_MODE" == "true" && -d "$NCRISIS_DIR" ]]; then
        rm -rf "${NCRISIS_DIR:?}"/*
    fi
    
    cd "$NCRISIS_DIR"
    
    # Clonar ou atualizar repositório
    if [[ -d ".git" && "$UPDATE_MODE" == "true" ]]; then
        log "INFO" "Atualizando repositório existente..."
        git fetch origin
        git reset --hard origin/main
    elif [[ -f "package.json" && -f "src/server-simple.ts" ]]; then
        log "INFO" "Arquivos do repositório já presentes - pulando clone..."
    else
        log "INFO" "Clonando repositório..."
        git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" . || \
            error_exit "Falha ao clonar repositório - verificar GITHUB_PERSONAL_ACCESS_TOKEN"
    fi
    
    # Criar estrutura de diretórios
    mkdir -p uploads tmp local_files shared_folders logs build
    
    # Configurar permissões
    chown -R root:root "$NCRISIS_DIR"
    chmod 755 "$NCRISIS_DIR"
    chmod 777 uploads tmp logs
    
    log "INFO" "Aplicação clonada em $NCRISIS_DIR"
}

install_dependencies() {
    log "STEP" "Instalando dependências..."
    
    cd "$NCRISIS_DIR"
    
    # Limpar node_modules se existir
    [[ -d "node_modules" ]] && rm -rf node_modules
    [[ -d "frontend/node_modules" ]] && rm -rf frontend/node_modules
    
    # Instalar dependências backend com retry
    log "INFO" "Instalando dependências backend..."
    retry 3 10 "npm ci --only=production --no-audit --no-fund"
    
    # Instalar dependências frontend
    log "INFO" "Instalando dependências frontend..."
    cd frontend
    retry 3 10 "npm ci --only=production --no-audit --no-fund"
    cd ..
    
    log "INFO" "Dependências instaladas"
}

configure_environment() {
    log "STEP" "Configurando ambiente de produção..."
    
    cd "$NCRISIS_DIR"
    
    # Criar arquivo de configuração principal
    cat > "$CONFIG_FILE" << EOF
# N.Crisis Configuration
NCRISIS_VERSION=$SCRIPT_VERSION
INSTALL_DATE=$(date -Iseconds)
DB_PASSWORD=$DB_PASSWORD
DOMAIN=$DOMAIN
EOF
    
    # Criar arquivo .env de produção
    cat > .env << EOF
# =================================================================
# N.CRISIS PRODUCTION CONFIGURATION
# =================================================================

# SERVER
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# DATABASE
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME
PGHOST=localhost
PGPORT=5432
PGUSER=$DB_USER
PGPASSWORD=$DB_PASSWORD
PGDATABASE=$DB_NAME

# REDIS
REDIS_URL=redis://:ncrisis_redis_2025@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=ncrisis_redis_2025

# OPENAI (funcionalidades AI)
OPENAI_API_KEY=${OPENAI_API_KEY:-}

# CLAMAV
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# UPLOAD
UPLOAD_DIR=$NCRISIS_DIR/uploads
TMP_DIR=$NCRISIS_DIR/tmp
MAX_FILE_SIZE=104857600

# SECURITY
CORS_ORIGINS=https://$DOMAIN,https://www.$DOMAIN

# SENDGRID (opcional)
SENDGRID_API_KEY=${SENDGRID_API_KEY:-}

# N8N (opcional)
N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL:-}

# PERFORMANCE
WORKER_CONCURRENCY=5
QUEUE_MAX_JOBS=1000

# LOGGING
LOG_LEVEL=info
DEBUG=ncrisis:*

# MONITORING
ENABLE_MONITORING=true
HEALTH_CHECK_INTERVAL=30000
EOF
    
    # Proteger arquivo de configuração
    chmod 600 .env "$CONFIG_FILE"
    
    log "INFO" "Ambiente configurado"
}

build_application() {
    log "STEP" "Compilando aplicação..."
    
    cd "$NCRISIS_DIR"
    
    # Instalar dependências de desenvolvimento temporariamente
    log "INFO" "Instalando dependências de build..."
    npm install --only=development --no-audit --no-fund
    
    # Aplicar schema do banco
    log "INFO" "Aplicando schema do banco de dados..."
    retry 3 5 "npm run db:push"
    
    # Compilar TypeScript
    log "INFO" "Compilando TypeScript..."
    npm run build || error_exit "Falha na compilação do backend"
    
    # Compilar frontend
    log "INFO" "Compilando frontend..."
    cd frontend
    npm run build || error_exit "Falha na compilação do frontend"
    cd ..
    
    # Remover dependências de desenvolvimento
    log "INFO" "Limpando dependências de desenvolvimento..."
    npm prune --production --no-audit --no-fund
    cd frontend && npm prune --production --no-audit --no-fund && cd ..
    
    # Verificar se build foi criado
    if [[ ! -f "build/src/server-simple.js" ]]; then
        error_exit "Arquivo de build não encontrado"
    fi
    
    log "INFO" "Aplicação compilada com sucesso"
}

# =================================================================
# CONFIGURAÇÃO DE SERVIÇOS DO SISTEMA
# =================================================================

setup_systemd() {
    log "STEP" "Configurando serviço systemd..."
    
    # Criar usuário de sistema para N.Crisis
    if ! id -u ncrisis >/dev/null 2>&1; then
        useradd -r -s /bin/false -d "$NCRISIS_DIR" ncrisis
    fi
    
    # Ajustar permissões
    chown -R ncrisis:ncrisis "$NCRISIS_DIR"/{uploads,tmp,logs}
    
    # Criar arquivo de serviço
    cat > /etc/systemd/system/ncrisis.service << EOF
[Unit]
Description=N.Crisis PII Detection & LGPD Platform
Documentation=https://github.com/resper1965/PrivacyShield
After=network.target postgresql.service redis-server.service redis.service clamav-daemon.service clamd@scan.service
Wants=postgresql.service redis-server.service redis.service clamav-daemon.service clamd@scan.service

[Service]
Type=simple
User=ncrisis
Group=ncrisis
WorkingDirectory=$NCRISIS_DIR
Environment=NODE_ENV=production
Environment=PORT=5000
EnvironmentFile=$NCRISIS_DIR/.env
ExecStart=/usr/bin/node build/src/server-simple.js
ExecReload=/bin/kill -s HUP \$MAINPID

# Restart policy
Restart=always
RestartSec=10
TimeoutStartSec=60
TimeoutStopSec=30
KillMode=mixed

# Output
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ncrisis

# Security
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=$NCRISIS_DIR/uploads $NCRISIS_DIR/tmp $NCRISIS_DIR/logs

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096
LimitCORE=0
MemoryMax=2G

# Additional security
CapabilityBoundingSet=
AmbientCapabilities=
SystemCallArchitectures=native

[Install]
WantedBy=multi-user.target
EOF
    
    # Recarregar systemd e habilitar serviço
    systemctl daemon-reload
    systemctl enable ncrisis
    
    log "INFO" "Serviço systemd configurado"
}

setup_nginx() {
    log "STEP" "Configurando Nginx..."
    
    # Criar configuração do Nginx
    cat > /etc/nginx/sites-available/ncrisis << 'EOF'
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=100r/s;

# Upstream definition
upstream ncrisis_backend {
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    
    # ACME challenge for Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        try_files $uri =404;
    }
    
    # Redirect everything else to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN_PLACEHOLDER www.DOMAIN_PLACEHOLDER;
    
    # SSL configuration (to be managed by certbot)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 10m;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;
    
    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
    
    # Hide server information
    server_tokens off;
    
    # Client configuration
    client_max_body_size 100M;
    client_body_timeout 300s;
    client_header_timeout 60s;
    client_body_buffer_size 128k;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 4k;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/xml
        image/svg+xml
        font/truetype
        font/opentype
        application/font-woff
        application/font-woff2;
    
    # Main application with rate limiting
    location / {
        limit_req zone=general burst=200 nodelay;
        
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_connect_timeout 60s;
        
        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
    
    # API endpoints with stricter rate limiting
    location /api/ {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_send_timeout 300;
        proxy_connect_timeout 60s;
    }
    
    # Upload endpoints with very strict rate limiting
    location ~ ^/api/.*/(upload|archives) {
        limit_req zone=upload burst=10 nodelay;
        
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600;
        proxy_send_timeout 600;
        proxy_connect_timeout 60s;
        
        # Special settings for uploads
        client_max_body_size 100M;
        client_body_timeout 300s;
        proxy_request_buffering off;
    }
    
    # Static assets with aggressive caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        proxy_pass http://ncrisis_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        
        # Cache settings
        proxy_cache_valid 200 1y;
        proxy_ignore_headers Cache-Control;
    }
    
    # Health check endpoint (no rate limiting)
    location = /health {
        proxy_pass http://ncrisis_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        access_log off;
        proxy_read_timeout 30s;
        proxy_connect_timeout 10s;
    }
    
    # Block common attack vectors
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ ~$ {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    
    # Custom log format
    access_log /var/log/nginx/ncrisis.access.log combined;
    error_log /var/log/nginx/ncrisis.error.log warn;
}
EOF
    
    # Substituir placeholder do domínio
    sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/ncrisis
    
    # Ativar site
    case "$DISTRO" in
        "ubuntu"|"debian")
            ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
            rm -f /etc/nginx/sites-enabled/default
            ;;
        "centos"|"rhel"|"rocky"|"almalinux")
            # No RHEL/CentOS, incluir diretamente no nginx.conf
            if ! grep -q "include.*ncrisis" /etc/nginx/nginx.conf; then
                sed -i '/include \/etc\/nginx\/conf\.d\/\*\.conf;/a\    include /etc/nginx/sites-available/ncrisis;' /etc/nginx/nginx.conf
            fi
            ;;
    esac
    
    # Testar configuração
    nginx -t || error_exit "Configuração do Nginx inválida"
    
    # Iniciar Nginx
    systemctl enable nginx
    systemctl restart nginx
    
    log "INFO" "Nginx configurado para domínio: $DOMAIN"
}

setup_firewall() {
    log "STEP" "Configurando firewall..."
    
    case "$DISTRO" in
        "ubuntu"|"debian")
            # UFW
            ufw --force reset
            ufw default deny incoming
            ufw default allow outgoing
            ufw allow 22/tcp comment 'SSH'
            ufw allow 80/tcp comment 'HTTP'
            ufw allow 443/tcp comment 'HTTPS'
            ufw --force enable
            ;;
        "centos"|"rhel"|"rocky"|"almalinux")
            # Firewalld
            systemctl enable firewalld
            systemctl start firewalld
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            firewall-cmd --reload
            ;;
    esac
    
    # Configurar fail2ban
    cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-req-limit]
enabled = true
filter = nginx-req-limit
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 600
findtime = 60
EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    log "INFO" "Firewall configurado"
}

# =================================================================
# SSL E MONITORAMENTO
# =================================================================

setup_ssl() {
    if [[ "$SKIP_SSL" == "true" ]]; then
        log "INFO" "SSL configuração pulada (--skip-ssl)"
        return 0
    fi
    
    log "STEP" "Configurando SSL..."
    
    # Verificar se domínio resolve para este servidor
    local domain_ip=$(dig +short "$DOMAIN" 2>/dev/null | head -1)
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null)
    
    if [[ -n "$domain_ip" && -n "$server_ip" && "$domain_ip" == "$server_ip" ]]; then
        log "INFO" "Domínio $DOMAIN resolve corretamente para este servidor"
        
        # Obter certificado Let's Encrypt
        retry 2 5 "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN" || {
            log "WARN" "Falha ao obter certificado SSL automaticamente"
            return 0
        }
        
        # Configurar renovação automática
        echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'" | crontab -
        
        log "INFO" "SSL configurado com sucesso"
    else
        log "WARN" "Domínio não resolve para este servidor (DNS: $domain_ip, Servidor: $server_ip)"
        log "INFO" "Configure SSL manualmente após configurar DNS: certbot --nginx -d $DOMAIN"
    fi
}

setup_monitoring() {
    log "STEP" "Configurando monitoramento e backup..."
    
    # Script de backup
    cat > "$NCRISIS_DIR/backup.sh" << 'EOF'
#!/bin/bash

# Configurações
BACKUP_DIR="/opt/backups/ncrisis"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /var/log/ncrisis-backup.log
}

log "Iniciando backup: $DATE"

# Backup do banco de dados
log "Backup do banco de dados..."
source /etc/ncrisis/config
pg_dump -U ncrisis_user -h localhost ncrisis_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup dos uploads
log "Backup dos uploads..."
if [[ -d "/opt/ncrisis/uploads" ]]; then
    tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" -C /opt/ncrisis uploads
fi

# Backup da configuração
log "Backup da configuração..."
cp /opt/ncrisis/.env "$BACKUP_DIR/env_$DATE.backup"
cp /etc/ncrisis/config "$BACKUP_DIR/config_$DATE.backup"

# Backup dos logs importantes
log "Backup dos logs..."
if [[ -d "/opt/ncrisis/logs" ]]; then
    tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" -C /opt/ncrisis logs
fi

# Limpar backups antigos
log "Limpando backups antigos (>$RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.backup" -mtime +$RETENTION_DAYS -delete

# Verificar espaço em disco
DISK_USAGE=$(df /opt | awk 'NR==2 {print $5}' | sed 's/%//')
if (( DISK_USAGE > 85 )); then
    log "WARN: Espaço em disco baixo: $DISK_USAGE%"
fi

log "Backup concluído: $DATE"
EOF
    
    chmod +x "$NCRISIS_DIR/backup.sh"
    
    # Script de monitoramento
    cat > "$NCRISIS_DIR/monitor.sh" << 'EOF'
#!/bin/bash

# Configurações
NCRISIS_DIR="/opt/ncrisis"
LOG_FILE="/var/log/ncrisis-monitor.log"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Função de verificação de serviço
check_service() {
    local service="$1"
    if systemctl is-active --quiet "$service"; then
        echo "✓ $service: Running"
        return 0
    else
        echo "✗ $service: Stopped"
        log "ERROR: Service $service is not running"
        return 1
    fi
}

# Função de verificação de endpoint
check_endpoint() {
    local url="$1"
    local name="$2"
    if curl -sf "$url" >/dev/null 2>&1; then
        echo "✓ $name: OK"
        return 0
    else
        echo "✗ $name: Failed"
        log "ERROR: Endpoint $name ($url) is not responding"
        return 1
    fi
}

echo "=== N.Crisis System Monitor ==="
echo "Date: $(date)"
echo ""

# Verificar serviços críticos
echo "=== Services ==="
SERVICES_OK=true
for service in ncrisis nginx postgresql redis-server redis clamav-daemon clamd@scan; do
    if systemctl list-units --type=service | grep -q "$service"; then
        if ! check_service "$service"; then
            SERVICES_OK=false
        fi
    fi
done

echo ""

# Verificar aplicação
echo "=== Application Health ==="
APP_OK=true
if ! check_endpoint "http://localhost:5000/health" "Application"; then
    APP_OK=false
fi

echo ""

# Verificar AI services
echo "=== AI Services ==="
AI_OK=true
if ! check_endpoint "http://localhost:5000/api/v1/search/stats" "AI Services"; then
    AI_OK=false
fi

echo ""

# Verificar recursos do sistema
echo "=== System Resources ==="
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')

echo "CPU Usage: ${CPU_USAGE}%"
echo "Memory Usage: ${MEM_USAGE}%"
echo "Disk Usage: ${DISK_USAGE}%"

# Alertas de recursos
if (( $(echo "$CPU_USAGE > 80" | bc -l) )); then
    log "WARN: High CPU usage: ${CPU_USAGE}%"
fi

if (( $(echo "$MEM_USAGE > 85" | bc -l) )); then
    log "WARN: High memory usage: ${MEM_USAGE}%"
fi

if (( DISK_USAGE > 85 )); then
    log "WARN: High disk usage: ${DISK_USAGE}%"
fi

echo ""

# Status geral
echo "=== Overall Status ==="
if [[ "$SERVICES_OK" == "true" && "$APP_OK" == "true" ]]; then
    echo "✓ System Status: Healthy"
else
    echo "✗ System Status: Issues Detected"
    log "ERROR: System health check failed"
fi

# Verificar logs de erro recentes
echo ""
echo "=== Recent Errors ==="
if [[ -f "/var/log/ncrisis-install.log" ]]; then
    tail -5 /var/log/ncrisis-install.log | grep -i error || echo "No recent errors in install log"
fi

if journalctl -u ncrisis --since "1 hour ago" | grep -i error >/dev/null; then
    echo "Recent errors found in ncrisis service logs"
    journalctl -u ncrisis --since "1 hour ago" | grep -i error | tail -3
else
    echo "No recent errors in service logs"
fi
EOF
    
    chmod +x "$NCRISIS_DIR/monitor.sh"
    
    # Script de atualização
    cat > "$NCRISIS_DIR/update.sh" << 'EOF'
#!/bin/bash

set -euo pipefail

NCRISIS_DIR="/opt/ncrisis"
LOG_FILE="/var/log/ncrisis-update.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

log "Iniciando atualização do N.Crisis..."

cd "$NCRISIS_DIR"

# Fazer backup antes da atualização
log "Criando backup antes da atualização..."
./backup.sh

# Parar serviço
log "Parando serviço N.Crisis..."
systemctl stop ncrisis

# Atualizar código
log "Atualizando código do repositório..."
git fetch origin
git reset --hard origin/main

# Instalar dependências
log "Atualizando dependências..."
npm ci --only=production --no-audit --no-fund
cd frontend && npm ci --only=production --no-audit --no-fund && cd ..

# Aplicar migrações de banco
log "Aplicando migrações de banco..."
npm run db:push

# Compilar aplicação
log "Compilando aplicação..."
npm run build
cd frontend && npm run build && cd ..

# Reiniciar serviço
log "Reiniciando serviço N.Crisis..."
systemctl start ncrisis

# Aguardar estabilização
sleep 10

# Verificar se está funcionando
if curl -sf http://localhost:5000/health >/dev/null; then
    log "Atualização concluída com sucesso"
else
    error_exit "Aplicação não está respondendo após atualização"
fi
EOF
    
    chmod +x "$NCRISIS_DIR/update.sh"
    
    # Configurar crontabs
    cat > /etc/cron.d/ncrisis << EOF
# N.Crisis automated tasks

# Backup diário às 2:00 AM
0 2 * * * root $NCRISIS_DIR/backup.sh

# Monitoramento a cada 15 minutos
*/15 * * * * root $NCRISIS_DIR/monitor.sh > /dev/null

# Restart semanal (domingo às 3:00 AM)
0 3 * * 0 root systemctl restart ncrisis

# Limpeza de logs mensais
0 4 1 * * root find /opt/ncrisis/logs -name "*.log" -mtime +30 -delete

# Limpeza de uploads temporários
0 5 * * * root find /opt/ncrisis/tmp -type f -mtime +1 -delete
EOF
    
    # Configurar logrotate
    cat > /etc/logrotate.d/ncrisis << EOF
/opt/ncrisis/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 ncrisis ncrisis
    postrotate
        systemctl reload ncrisis || true
    endscript
}

/var/log/ncrisis*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
    
    log "INFO" "Monitoramento e backup configurados"
}

# =================================================================
# INICIALIZAÇÃO E TESTES
# =================================================================

start_services() {
    log "STEP" "Iniciando serviços..."
    
    # Verificar se dependências estão rodando
    local deps=("postgresql" "redis-server" "redis" "nginx")
    for dep in "${deps[@]}"; do
        if systemctl list-units --type=service | grep -q "$dep"; then
            if ! systemctl is-active --quiet "$dep"; then
                log "INFO" "Iniciando $dep..."
                systemctl start "$dep" || log "WARN" "Falha ao iniciar $dep"
            fi
        fi
    done
    
    # Aguardar dependências estabilizarem
    sleep 5
    
    # Iniciar N.Crisis
    log "INFO" "Iniciando N.Crisis..."
    systemctl start ncrisis
    
    # Aguardar aplicação inicializar
    log "INFO" "Aguardando aplicação inicializar..."
    local attempts=0
    local max_attempts=30
    
    while (( attempts < max_attempts )); do
        if systemctl is-active --quiet ncrisis; then
            if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
                log "INFO" "N.Crisis iniciado com sucesso"
                return 0
            fi
        fi
        
        sleep 2
        ((attempts++))
        
        if (( attempts % 5 == 0 )); then
            log "INFO" "Aguardando inicialização... ($attempts/$max_attempts)"
        fi
    done
    
    # Se chegou aqui, algo deu errado
    log "ERROR" "Falha ao iniciar N.Crisis - verificando logs..."
    journalctl -u ncrisis --no-pager -n 20
    error_exit "N.Crisis não inicializou corretamente"
}

run_comprehensive_tests() {
    log "STEP" "Executando testes abrangentes..."
    
    local all_tests_passed=true
    
    # Teste 1: Health Check
    log "INFO" "Teste 1: Health Check..."
    if curl -sf http://localhost:5000/health | jq -e '.status == "ok"' >/dev/null 2>&1; then
        log "INFO" "✓ Health Check: OK"
    else
        log "ERROR" "✗ Health Check: FALHOU"
        all_tests_passed=false
    fi
    
    # Teste 2: Database Connection
    log "INFO" "Teste 2: Conexão com banco de dados..."
    if PGPASSWORD="$DB_PASSWORD" psql -U "$DB_USER" -h localhost -d "$DB_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        log "INFO" "✓ Database: OK"
    else
        log "ERROR" "✗ Database: FALHOU"
        all_tests_passed=false
    fi
    
    # Teste 3: Redis Connection
    log "INFO" "Teste 3: Conexão com Redis..."
    if redis-cli -a ncrisis_redis_2025 ping 2>/dev/null | grep -q PONG; then
        log "INFO" "✓ Redis: OK"
    else
        log "ERROR" "✗ Redis: FALHOU"
        all_tests_passed=false
    fi
    
    # Teste 4: AI Services (se OpenAI configurado)
    if [[ -n "${OPENAI_API_KEY:-}" ]]; then
        log "INFO" "Teste 4: Serviços AI..."
        if curl -sf http://localhost:5000/api/v1/search/stats | jq -e '.success == true' >/dev/null 2>&1; then
            log "INFO" "✓ AI Services: OK"
        else
            log "WARN" "✗ AI Services: LIMITADO (verifique OPENAI_API_KEY)"
        fi
    else
        log "INFO" "Teste 4: AI Services pulado (OPENAI_API_KEY não configurado)"
    fi
    
    # Teste 5: Upload Endpoint
    log "INFO" "Teste 5: Endpoint de upload..."
    if curl -sf http://localhost:5000/api/v1/archives/upload -X OPTIONS >/dev/null 2>&1; then
        log "INFO" "✓ Upload Endpoint: OK"
    else
        log "ERROR" "✗ Upload Endpoint: FALHOU"
        all_tests_passed=false
    fi
    
    # Teste 6: Frontend Assets
    log "INFO" "Teste 6: Frontend assets..."
    if curl -sf http://localhost:5000/ | grep -q "n.crisis" 2>/dev/null; then
        log "INFO" "✓ Frontend: OK"
    else
        log "ERROR" "✗ Frontend: FALHOU"
        all_tests_passed=false
    fi
    
    # Teste 7: SSL (se configurado)
    if [[ "$SKIP_SSL" != "true" ]]; then
        log "INFO" "Teste 7: SSL Certificate..."
        if curl -sf "https://$DOMAIN/health" >/dev/null 2>&1; then
            log "INFO" "✓ SSL: OK"
        else
            log "WARN" "✗ SSL: Não configurado ou falhou"
        fi
    fi
    
    # Resultado final
    if [[ "$all_tests_passed" == "true" ]]; then
        log "INFO" "✓ Todos os testes essenciais passaram"
        return 0
    else
        log "WARN" "✗ Alguns testes falharam - sistema pode estar parcialmente funcional"
        return 1
    fi
}

# =================================================================
# FUNÇÕES DE UTILIDADE
# =================================================================

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --update)
                UPDATE_MODE=true
                shift
                ;;
            --backup)
                BACKUP_MODE=true
                shift
                ;;
            --force)
                FORCE_MODE=true
                shift
                ;;
            --skip-ssl)
                SKIP_SSL=true
                shift
                ;;
            --domain=*)
                DOMAIN="${1#*=}"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log "ERROR" "Opção desconhecida: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
N.Crisis - Complete Production Installation Script

USAGE:
    $0 [OPTIONS]

OPTIONS:
    --update        Atualizar instalação existente
    --backup        Fazer backup antes de instalar/atualizar
    --force         Forçar reinstalação (remove instalação existente)
    --skip-ssl      Pular configuração automática de SSL
    --domain=HOST   Especificar domínio (padrão: $DOMAIN)
    --help, -h      Mostrar esta ajuda

ENVIRONMENT VARIABLES:
    GITHUB_PERSONAL_ACCESS_TOKEN    Token para acessar repositório privado (obrigatório)
    OPENAI_API_KEY                  Chave OpenAI para funcionalidades AI (recomendado)
    SENDGRID_API_KEY               Chave SendGrid para notificações (opcional)
    N8N_WEBHOOK_URL                URL do webhook N8N (opcional)
    NCRISIS_DOMAIN                 Domínio principal (padrão: monster.e-ness.com.br)
    NCRISIS_DB_PASSWORD            Senha do banco (gerada automaticamente se não especificada)

EXAMPLES:
    # Instalação completa
    export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxx"
    export OPENAI_API_KEY="sk-proj-xxxx"
    $0

    # Atualização com backup
    $0 --update --backup

    # Reinstalação forçada
    $0 --force --domain=meudominio.com

SUPPORT:
    Logs: $LOG_FILE
    Docs: /opt/ncrisis/README.md
EOF
}

show_final_summary() {
    local install_status="$1"
    
    cat << EOF

==================================================================
🎉 N.CRISIS INSTALLATION COMPLETE!
==================================================================

Status: $(if [[ "$install_status" == "0" ]]; then echo "✓ SUCCESS"; else echo "⚠ PARTIAL"; fi)
Version: $SCRIPT_VERSION
Installation: $(date)

📍 LOCATION:
   Directory: $NCRISIS_DIR
   Config: $CONFIG_FILE
   Logs: $LOG_FILE

🌐 ACCESS:
   URL: https://$DOMAIN
   Health: https://$DOMAIN/health
   AI Chat: https://$DOMAIN/busca-ia
   Dashboard: https://$DOMAIN

📋 SERVICES:
   • N.Crisis: systemctl status ncrisis
   • Nginx: systemctl status nginx
   • PostgreSQL: systemctl status postgresql
   • Redis: systemctl status redis-server
   • ClamAV: systemctl status clamav-daemon

🔧 MANAGEMENT:
   • Logs: journalctl -u ncrisis -f
   • Monitor: $NCRISIS_DIR/monitor.sh
   • Backup: $NCRISIS_DIR/backup.sh
   • Update: $NCRISIS_DIR/update.sh

🔐 CONFIGURATION:
   • Database: $DB_USER@localhost:5432/$DB_NAME
   • Environment: $NCRISIS_DIR/.env
   • Config: $CONFIG_FILE

📊 FEATURES AVAILABLE:
   ✓ PII Detection (CPF, CNPJ, Email, Phone, Names)
   ✓ LGPD Compliance Reports
   ✓ Real-time Processing
   ✓ Virus Scanning (ClamAV)
   $(if [[ -n "${OPENAI_API_KEY:-}" ]]; then echo "✓ AI Chat & Analysis"; else echo "⚠ AI Limited (OPENAI_API_KEY not set)"; fi)
   ✓ WebSocket Real-time Updates
   ✓ Automated Backups
   ✓ System Monitoring

🚀 NEXT STEPS:
   1. Test all functionality at https://$DOMAIN
   2. Configure N8N integration (if available)
   3. Set up off-site backups
   4. Review security settings
   5. Configure additional domains (if needed)

📞 SUPPORT:
   • Installation Log: $LOG_FILE
   • System Monitor: $NCRISIS_DIR/monitor.sh
   • Documentation: $NCRISIS_DIR/README.md
   • Health Check: $NCRISIS_DIR/monitor.sh

$(if [[ "$install_status" != "0" ]]; then
echo "⚠ ATTENTION:"
echo "   Some tests failed during installation."
echo "   Review logs and run monitor script for details."
echo "   System may still be functional."
fi)

==================================================================
Installation completed at $(date)
==================================================================

EOF
}

# =================================================================
# FUNÇÃO PRINCIPAL
# =================================================================

main() {
    # Inicializar log
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    log "INFO" "=== N.Crisis Installation Started ==="
    log "INFO" "Script Version: $SCRIPT_VERSION"
    log "INFO" "Target Domain: $DOMAIN"
    log "INFO" "Installation Mode: $(if [[ "$UPDATE_MODE" == "true" ]]; then echo "UPDATE"; else echo "FRESH"; fi)"
    
    # Parse argumentos
    parse_arguments "$@"
    
    # Executar instalação
    detect_system
    check_prerequisites
    
    if [[ "$BACKUP_MODE" == "true" && -d "$NCRISIS_DIR" ]]; then
        log "INFO" "Fazendo backup conforme solicitado..."
        if [[ -f "$NCRISIS_DIR/backup.sh" ]]; then
            "$NCRISIS_DIR/backup.sh"
        fi
    fi
    
    install_base_packages
    install_nodejs
    setup_postgresql
    setup_redis
    setup_clamav
    install_application
    install_dependencies
    configure_environment
    build_application
    setup_systemd
    setup_nginx
    setup_firewall
    setup_ssl
    setup_monitoring
    start_services
    
    # Executar testes
    local test_result=0
    run_comprehensive_tests || test_result=1
    
    # Mostrar resumo final
    show_final_summary "$test_result"
    
    log "INFO" "=== N.Crisis Installation Finished ==="
    
    exit $test_result
}

# =================================================================
# EXECUÇÃO
# =================================================================

# Verificar se o script está sendo executado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
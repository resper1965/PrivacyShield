#!/bin/bash

# =================================================================
# N.Crisis Bootstrap Script
# Download inicial para VPS zerada (sem dependência de GitHub raw)
# =================================================================

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

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

# Verificar se é root
if [[ $EUID -ne 0 ]]; then
    error "Execute como root: sudo bash bootstrap-ncrisis.sh"
fi

log "N.Crisis Bootstrap - Iniciando download..."

# Verificar tokens
if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
    error "GITHUB_PERSONAL_ACCESS_TOKEN não configurado"
fi

# Criar diretório temporário
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

log "Criando script de instalação offline..."

# Método 1: Usar API do GitHub para baixar
download_with_api() {
    log "Tentando download via GitHub API..."
    
    local response=$(curl -s -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
        "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-ncrisis.sh")
    
    if echo "$response" | grep -q '"content"'; then
        echo "$response" | grep '"content"' | cut -d'"' -f4 | base64 -d > install-ncrisis.sh
        chmod +x install-ncrisis.sh
        log "Download via API bem-sucedido"
        return 0
    else
        warn "Falha no download via API"
        return 1
    fi
}

# Método 2: Clonar repositório e extrair script
download_with_clone() {
    log "Tentando download via git clone..."
    
    if command -v git >/dev/null 2>&1; then
        if git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" repo; then
            cp repo/install-ncrisis.sh .
            chmod +x install-ncrisis.sh
            rm -rf repo
            log "Download via clone bem-sucedido"
            return 0
        else
            warn "Falha no git clone"
            return 1
        fi
    else
        warn "Git não instalado"
        return 1
    fi
}

# Método 3: Instalar dependências básicas e tentar novamente
install_basic_deps() {
    log "Instalando dependências básicas..."
    
    if command -v apt >/dev/null 2>&1; then
        apt update >/dev/null 2>&1
        apt install -y curl wget git ca-certificates >/dev/null 2>&1
    elif command -v yum >/dev/null 2>&1; then
        yum update -y >/dev/null 2>&1
        yum install -y curl wget git ca-certificates >/dev/null 2>&1
    elif command -v dnf >/dev/null 2>&1; then
        dnf update -y >/dev/null 2>&1
        dnf install -y curl wget git ca-certificates >/dev/null 2>&1
    else
        error "Gerenciador de pacotes não suportado"
    fi
    
    log "Dependências básicas instaladas"
}

# Método 4: Criar script inline como fallback
create_inline_script() {
    log "Criando script de instalação inline..."
    
    cat > install-ncrisis-mini.sh << 'SCRIPT_EOF'
#!/bin/bash

# N.Crisis Mini Installer - Fallback
# Este script baixa e executa o instalador completo

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Verificar token
if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
    error "GITHUB_PERSONAL_ACCESS_TOKEN não configurado"
fi

log "N.Crisis Mini Installer iniciado..."

# Atualizar sistema
log "Atualizando sistema..."
if command -v apt >/dev/null 2>&1; then
    apt update && apt upgrade -y
    apt install -y curl wget git build-essential software-properties-common jq
elif command -v dnf >/dev/null 2>&1; then
    dnf update -y
    dnf install -y curl wget git gcc gcc-c++ make jq
fi

# Instalar Node.js 20
log "Instalando Node.js 20..."
if command -v apt >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
elif command -v dnf >/dev/null 2>&1; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
fi

# Clonar repositório
log "Clonando repositório..."
cd /opt
git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" ncrisis
cd ncrisis

# Executar instalação manual simplificada
log "Executando instalação manual..."

# PostgreSQL
log "Configurando PostgreSQL..."
if command -v apt >/dev/null 2>&1; then
    apt install -y postgresql postgresql-contrib
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y postgresql postgresql-server postgresql-contrib
    postgresql-setup --initdb
fi

systemctl enable postgresql
systemctl start postgresql

# Criar banco
DB_PASSWORD=$(openssl rand -hex 16)
sudo -u postgres psql << EOF
CREATE USER ncrisis_user WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE ncrisis_db OWNER ncrisis_user;
GRANT ALL PRIVILEGES ON DATABASE ncrisis_db TO ncrisis_user;
\q
EOF

# Redis
log "Configurando Redis..."
if command -v apt >/dev/null 2>&1; then
    apt install -y redis-server
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y redis
fi

systemctl enable redis-server || systemctl enable redis
systemctl start redis-server || systemctl start redis

# Nginx
log "Configurando Nginx..."
if command -v apt >/dev/null 2>&1; then
    apt install -y nginx
elif command -v dnf >/dev/null 2>&1; then
    dnf install -y nginx
fi

systemctl enable nginx
systemctl start nginx

# Configurar aplicação
log "Configurando aplicação..."

# Criar .env
cat > .env << ENV_EOF
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis_user:$DB_PASSWORD@localhost:5432/ncrisis_db
PGUSER=ncrisis_user
PGPASSWORD=$DB_PASSWORD
PGDATABASE=ncrisis_db
PGHOST=localhost
PGPORT=5432
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=${OPENAI_API_KEY:-}
SENDGRID_API_KEY=${SENDGRID_API_KEY:-}
UPLOAD_DIR=/opt/ncrisis/uploads
TMP_DIR=/opt/ncrisis/tmp
CORS_ORIGINS=https://monster.e-ness.com.br
ENV_EOF

# Instalar dependências e compilar
npm install --production
cd frontend && npm install --production && npm run build && cd ..
npm run db:push
npm run build

# Criar systemd service
cat > /etc/systemd/system/ncrisis.service << SERVICE_EOF
[Unit]
Description=N.Crisis Application
After=network.target postgresql.service redis-server.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ncrisis
Environment=NODE_ENV=production
EnvironmentFile=/opt/ncrisis/.env
ExecStart=/usr/bin/node build/src/server-simple.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

systemctl daemon-reload
systemctl enable ncrisis
systemctl start ncrisis

# Configurar Nginx
cat > /etc/nginx/sites-available/ncrisis << NGINX_EOF
server {
    listen 80;
    server_name monster.e-ness.com.br;

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
NGINX_EOF

if [[ -d "/etc/nginx/sites-enabled" ]]; then
    ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
fi

systemctl restart nginx

log "Instalação concluída!"
log "Acesse: http://monster.e-ness.com.br"
log "Status: systemctl status ncrisis"

SCRIPT_EOF

    chmod +x install-ncrisis-mini.sh
    log "Script inline criado: install-ncrisis-mini.sh"
}

# Executar métodos em ordem
main() {
    log "Iniciando download do N.Crisis..."
    
    # Verificar se temos dependências básicas
    if ! command -v curl >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
        install_basic_deps
    fi
    
    # Tentar métodos de download
    if download_with_api; then
        log "Script principal baixado com sucesso"
        ./install-ncrisis.sh "$@"
    elif download_with_clone; then
        log "Script principal baixado via clone"
        ./install-ncrisis.sh "$@"
    else
        warn "Todos os métodos de download falharam"
        log "Executando instalação manual simplificada..."
        create_inline_script
        ./install-ncrisis-mini.sh
    fi
    
    # Cleanup
    cd /
    rm -rf "$TEMP_DIR"
    
    log "N.Crisis instalado com sucesso!"
}

main "$@"
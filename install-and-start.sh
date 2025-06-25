#!/bin/bash

# N.Crisis - Script Único de Instalação e Inicialização
# Agrega todas as funcionalidades em um script funcional
# Para Ubuntu 22.04+ VPS

set -euo pipefail

readonly APP_DIR="/opt/ncrisis"
readonly LOG_FILE="/tmp/ncrisis-install.log"
readonly APP_LOG="/tmp/ncrisis-app.log"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

error_exit() {
    log "ERROR" "$1"
    echo -e "${RED}ERRO: $1${NC}"
    echo "Verifique o log: $LOG_FILE"
    exit 1
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "Este script deve ser executado como root (use sudo)"
    exit 1
fi

echo "=========================================="
echo "    N.CRISIS - INSTALAÇÃO COMPLETA"
echo "=========================================="
echo ""

# Initialize log
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
log "INFO" "Iniciando instalação N.Crisis"

# 1. Verificar token GitHub
if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
    echo ""
    echo "ERRO: GITHUB_PERSONAL_ACCESS_TOKEN não está definido!"
    echo ""
    echo "O repositório é PRIVADO e requer token de acesso."
    echo ""
    echo "Como obter:"
    echo "1. Acesse: https://github.com/settings/tokens"
    echo "2. Clique em 'Generate new token (classic)'"
    echo "3. Marque: repo (Full control of private repositories)"
    echo "4. Copie o token"
    echo ""
    echo "Como usar:"
    echo "   export GITHUB_PERSONAL_ACCESS_TOKEN=\"seu_token\""
    echo "   sudo -E ./install-and-start.sh"
    echo ""
    exit 1
fi

log "INFO" "Token GitHub detectado: ${GITHUB_PERSONAL_ACCESS_TOKEN:0:10}..."

# 2. Verificar sistema
log "INFO" "Verificando sistema..."
if [[ ! -f /etc/os-release ]]; then
    error_exit "Sistema operacional não suportado"
fi

source /etc/os-release
if [[ "$ID" != "ubuntu" ]]; then
    log "WARN" "Sistema: $PRETTY_NAME (recomendado: Ubuntu 22.04+)"
fi

# 3. Atualizar sistema
log "INFO" "Atualizando sistema..."
apt-get update -qq
apt-get install -y curl wget git postgresql postgresql-contrib nodejs npm

# 4. Verificar Node.js
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
    log "INFO" "Instalando Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

log "INFO" "Node.js: $(node --version)"

# 5. Verificar TypeScript
if ! command -v ts-node &> /dev/null; then
    log "INFO" "Instalando TypeScript globalmente..."
    npm install -g typescript ts-node
fi

# 6. Configurar usuário da aplicação
log "INFO" "Configurando usuário da aplicação..."
if ! id "ncrisis" &>/dev/null; then
    useradd -m -s /bin/bash ncrisis
    log "INFO" "Usuário 'ncrisis' criado"
fi

# 7. Parar processos existentes
log "INFO" "Parando processos existentes..."
pkill -f "ts-node.*server-simple" 2>/dev/null || true
pkill -f "node.*server-simple" 2>/dev/null || true

# 8. Configurar diretório da aplicação
log "INFO" "Configurando aplicação..."
GITHUB_AUTH="https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git"

if [[ -d "$APP_DIR" ]] && [[ "$(ls -A "$APP_DIR" 2>/dev/null)" ]]; then
    log "WARN" "Diretório já existe, atualizando..."
    cd "$APP_DIR"
    if [[ -d ".git" ]]; then
        sudo -u ncrisis git fetch origin main || error_exit "Falha ao buscar atualizações"
        sudo -u ncrisis git reset --hard origin/main || error_exit "Falha ao atualizar"
    else
        log "INFO" "Removendo diretório existente..."
        rm -rf "$APP_DIR"
        sudo -u ncrisis git clone "$GITHUB_AUTH" "$APP_DIR" || error_exit "Falha ao clonar"
    fi
else
    log "INFO" "Clonando repositório..."
    mkdir -p "$APP_DIR"
    chown ncrisis:ncrisis "$APP_DIR"
    sudo -u ncrisis git clone "$GITHUB_AUTH" "$APP_DIR" || error_exit "Falha ao clonar"
fi

chown -R ncrisis:ncrisis "$APP_DIR"
cd "$APP_DIR"

# 9. Configurar PostgreSQL
log "INFO" "Configurando PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql

# Criar usuário e banco
sudo -u postgres psql -c "DROP DATABASE IF EXISTS ncrisis;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS ncrisis;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER ncrisis WITH ENCRYPTED PASSWORD 'ncrisis123';"
sudo -u postgres psql -c "CREATE DATABASE ncrisis OWNER ncrisis;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ncrisis TO ncrisis;"

# 10. Instalar dependências
log "INFO" "Instalando dependências npm..."
sudo -u ncrisis npm install

# 11. Configurar ambiente
log "INFO" "Configurando variáveis de ambiente..."
cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis:ncrisis123@localhost:5432/ncrisis
CORS_ORIGINS=https://monster.e-ness.com.br,http://monster.e-ness.com.br:5000,http://localhost:5000

# Optional services (configure if needed)
# SENDGRID_API_KEY=
# OPENAI_API_KEY=
# REDIS_URL=redis://localhost:6379
EOF

chown ncrisis:ncrisis .env

# 12. Configurar banco de dados
log "INFO" "Configurando banco de dados..."
if [[ -f "prisma/schema.prisma" ]]; then
    sudo -u ncrisis npx prisma generate || true
    sudo -u ncrisis npx prisma db push || true
fi

# 13. Criar diretórios necessários
log "INFO" "Criando diretórios..."
mkdir -p uploads logs tmp local_files shared_folders
chown -R ncrisis:ncrisis uploads logs tmp local_files shared_folders

# 14. Configurar firewall
log "INFO" "Configurando firewall..."
ufw allow 5000/tcp 2>/dev/null || true
ufw allow 22/tcp 2>/dev/null || true
ufw --force enable 2>/dev/null || true

# 15. Iniciar aplicação
log "INFO" "Iniciando N.Crisis..."
touch "$APP_LOG"
chmod 666 "$APP_LOG"

sudo -u ncrisis bash -c "
cd '$APP_DIR'
export NODE_ENV=production
export PORT=5000
export HOST=0.0.0.0
nohup ts-node src/server-simple.ts > '$APP_LOG' 2>&1 &
echo \$! > /tmp/ncrisis.pid
"

# 16. Verificar inicialização
log "INFO" "Verificando inicialização..."
sleep 8

if pgrep -f "ts-node.*server-simple" > /dev/null; then
    PID=$(cat /tmp/ncrisis.pid 2>/dev/null || echo "unknown")
    log "INFO" "✅ N.Crisis iniciado! PID: $PID"
    
    # Testar health check
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        log "INFO" "✅ Health check OK!"
        
        echo ""
        echo "=========================================="
        echo "    ✅ INSTALAÇÃO CONCLUÍDA!"
        echo "=========================================="
        echo ""
        echo "🚀 N.Crisis está rodando em:"
        echo "   http://monster.e-ness.com.br:5000"
        echo "   http://localhost:5000"
        echo ""
        echo "📊 Status:"
        echo "   Health: curl http://localhost:5000/health"
        echo "   Logs: tail -f $APP_LOG"
        echo "   PID: $PID"
        echo ""
        echo "🔧 Controles:"
        echo "   Parar: pkill -f 'ts-node.*server-simple'"
        echo "   Reiniciar: sudo systemctl restart ncrisis"
        echo ""
        
        # 17. Criar serviço systemd
        log "INFO" "Criando serviço systemd..."
        cat > /etc/systemd/system/ncrisis.service << EOF
[Unit]
Description=N.Crisis PII Detection Service
After=network.target postgresql.service

[Service]
Type=simple
User=ncrisis
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/ts-node src/server-simple.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF

        systemctl daemon-reload
        systemctl enable ncrisis
        
        echo "🎯 Próximos passos:"
        echo "   1. Configure SENDGRID_API_KEY no .env para emails"
        echo "   2. Configure OPENAI_API_KEY no .env para IA (opcional)"
        echo "   3. Configure SSL: certbot --nginx -d monster.e-ness.com.br"
        echo ""
        
    else
        log "WARN" "Health check falhou, verificando logs..."
        echo ""
        echo "⚠️ Aplicação iniciou mas health check falhou."
        echo "Logs dos últimos erros:"
        tail -10 "$APP_LOG"
    fi
else
    log "ERROR" "Falha ao iniciar aplicação"
    echo ""
    echo "❌ Falha na inicialização. Logs de erro:"
    tail -20 "$APP_LOG"
    echo ""
    echo "Para debug:"
    echo "  cd $APP_DIR"
    echo "  sudo -u ncrisis ts-node src/server-simple.ts"
    exit 1
fi

log "INFO" "Instalação finalizada"
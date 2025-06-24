#!/bin/bash

# N.Crisis VPS Startup Fix
# Script para diagnosticar e corrigir problemas de inicialização

set -euo pipefail

readonly APP_DIR="/opt/ncrisis"
readonly LOG_FILE="/var/log/ncrisis-startup-fix.log"

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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    echo "Este script deve ser executado como root (use sudo)"
    exit 1
fi

echo "=== N.Crisis VPS Startup Fix ==="
log "INFO" "Iniciando diagnóstico..."

# 1. Verificar diretório da aplicação
if [[ ! -d "$APP_DIR" ]]; then
    log "ERROR" "Diretório $APP_DIR não existe"
    echo "A instalação não foi concluída corretamente."
    echo "Execute novamente o install-vps-complete.sh"
    exit 1
fi

log "INFO" "Diretório $APP_DIR encontrado"
cd "$APP_DIR"

# 2. Verificar se é repositório Git
if [[ ! -d ".git" ]]; then
    log "ERROR" "Não é um repositório Git válido"
    echo "O repositório não foi clonado corretamente."
    exit 1
fi

log "INFO" "Repositório Git válido"

# 3. Verificar arquivos essenciais
missing_files=()
[[ ! -f "package.json" ]] && missing_files+=("package.json")
[[ ! -f "src/server-simple.ts" ]] && missing_files+=("src/server-simple.ts")

if [[ ${#missing_files[@]} -gt 0 ]]; then
    log "ERROR" "Arquivos essenciais faltando: ${missing_files[*]}"
    echo "Tentando atualizar repositório..."
    
    sudo -u ncrisis git fetch origin main
    sudo -u ncrisis git reset --hard origin/main
    
    log "INFO" "Repositório atualizado"
fi

# 4. Verificar se processo já está rodando
if pgrep -f "node.*server-simple" > /dev/null; then
    log "WARN" "Processo N.Crisis já está rodando"
    echo "Parando processo existente..."
    pkill -f "node.*server-simple" || true
    sleep 2
fi

# 5. Verificar Docker
if command -v docker > /dev/null && systemctl is-active docker > /dev/null; then
    log "INFO" "Docker disponível e ativo"
    
    # Parar containers existentes
    if docker ps | grep -q ncrisis; then
        log "INFO" "Parando containers N.Crisis existentes..."
        docker stop $(docker ps | grep ncrisis | awk '{print $1}') || true
    fi
    
    # Tentar iniciar com Docker Compose
    if [[ -f "docker-compose.production.yml" ]]; then
        log "INFO" "Iniciando com docker-compose.production.yml..."
        docker compose -f docker-compose.production.yml up -d
        sleep 5
        
        if docker ps | grep -q ncrisis; then
            log "INFO" "✅ N.Crisis iniciado com Docker"
            docker ps | grep ncrisis
        else
            log "WARN" "Falha no Docker, tentando Node.js direto..."
        fi
    fi
else
    log "INFO" "Docker não disponível, usando Node.js direto"
fi

# 6. Se Docker falhou, tentar Node.js direto
if ! docker ps 2>/dev/null | grep -q ncrisis && ! pgrep -f "node.*server-simple" > /dev/null; then
    log "INFO" "Iniciando com Node.js direto..."
    
    # Verificar Node.js
    if ! command -v node > /dev/null; then
        log "ERROR" "Node.js não está instalado"
        exit 1
    fi
    
    # Instalar dependências se necessário
    if [[ ! -d "node_modules" ]]; then
        log "INFO" "Instalando dependências npm..."
        sudo -u ncrisis npm install
    fi
    
    # Compilar TypeScript se necessário
    if [[ ! -d "build" ]] && [[ -f "tsconfig.json" ]]; then
        log "INFO" "Compilando TypeScript..."
        sudo -u ncrisis npm run build
    fi
    
    # Configurar variáveis de ambiente
    if [[ ! -f ".env" ]] && [[ -f ".env.example" ]]; then
        log "INFO" "Criando arquivo .env..."
        cp .env.example .env
        chown ncrisis:ncrisis .env
    fi
    
    # Iniciar aplicação em background
    log "INFO" "Iniciando aplicação N.Crisis..."
    sudo -u ncrisis bash -c 'cd /opt/ncrisis && NODE_ENV=production PORT=5000 HOST=0.0.0.0 nohup ts-node src/server-simple.ts > /var/log/ncrisis-app.log 2>&1 &'
    
    sleep 3
fi

# 7. Verificar se aplicação está rodando
log "INFO" "Verificando status da aplicação..."

# Verificar processo
if pgrep -f "node.*server-simple" > /dev/null || docker ps | grep -q ncrisis; then
    log "INFO" "✅ Processo N.Crisis está rodando"
else
    log "ERROR" "❌ Processo N.Crisis não foi iniciado"
fi

# Verificar porta
if netstat -tlnp | grep -q ":5000"; then
    log "INFO" "✅ Porta 5000 está em uso"
    netstat -tlnp | grep ":5000"
else
    log "ERROR" "❌ Porta 5000 não está sendo usada"
fi

# Verificar health check local
sleep 2
if curl -s http://localhost:5000/health > /dev/null; then
    log "INFO" "✅ Health check local funcionando"
else
    log "ERROR" "❌ Health check local falhou"
fi

# 8. Configurar firewall se necessário
if command -v ufw > /dev/null; then
    if ! ufw status | grep -q "5000/tcp"; then
        log "INFO" "Configurando firewall para porta 5000..."
        ufw allow 5000/tcp
    fi
fi

# 9. Mostrar status final
echo ""
echo "=== Status Final ==="
echo "Processos N.Crisis:"
pgrep -f "node.*server-simple" && ps aux | grep -v grep | grep "node.*server-simple" || echo "Nenhum processo Node.js"
docker ps | grep ncrisis || echo "Nenhum container Docker"

echo ""
echo "Portas em uso:"
netstat -tlnp | grep ":5000" || echo "Porta 5000 não em uso"

echo ""
echo "Teste de conexão:"
curl -s http://localhost:5000/health && echo "✅ Health check OK" || echo "❌ Health check falhou"

echo ""
echo "Para testar externamente:"
echo "curl http://monster.e-ness.com.br:5000/health"

log "INFO" "Diagnóstico concluído. Verifique o log: $LOG_FILE"
#!/bin/bash

# =================================================================
# N.Crisis Download Script - Download direto para /opt/ncrisis
# Comando inequívoco para Ubuntu Linux
# =================================================================

set -euo pipefail

readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Verificar se é root
if [[ $EUID -ne 0 ]]; then
    error "Execute como root: sudo bash download-ncrisis.sh"
fi

# Verificar token
if [[ -z "${GITHUB_PERSONAL_ACCESS_TOKEN:-}" ]]; then
    error "Variável GITHUB_PERSONAL_ACCESS_TOKEN não configurada"
fi

log "Iniciando download do N.Crisis para /opt/ncrisis..."

# Instalar dependências básicas se necessário
if ! command -v git >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
    log "Instalando dependências básicas..."
    apt update >/dev/null 2>&1
    apt install -y git curl wget >/dev/null 2>&1
fi

# Criar diretório de destino
log "Criando diretório /opt/ncrisis..."
mkdir -p /opt/ncrisis
cd /opt/ncrisis

# Limpar diretório se existir conteúdo
if [[ "$(ls -A .)" ]]; then
    warn "Diretório não está vazio. Fazendo backup..."
    mv /opt/ncrisis /opt/ncrisis-backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
    mkdir -p /opt/ncrisis
    cd /opt/ncrisis
fi

# Método 1: Git clone direto (mais confiável)
log "Clonando repositório via git..."
if git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" .; then
    log "Clone via git bem-sucedido"
    
    # Verificar se arquivos essenciais existem
    if [[ -f "install-ncrisis.sh" && -f "package.json" ]]; then
        chmod +x install-ncrisis.sh
        log "Scripts baixados com sucesso em /opt/ncrisis"
        log "Para instalar, execute: cd /opt/ncrisis && ./install-ncrisis.sh"
        exit 0
    else
        error "Arquivos essenciais não encontrados após clone"
    fi
else
    error "Falha no git clone - verifique o token GITHUB_PERSONAL_ACCESS_TOKEN"
fi
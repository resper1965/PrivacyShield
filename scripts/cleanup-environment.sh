#!/bin/bash

# N.Crisis Environment Cleanup Script
# Remove completamente o ambiente atual antes da nova instalação

set -e

echo "🧹 N.Crisis - Limpeza do Ambiente"
echo "================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se é root
if [[ $EUID -eq 0 ]]; then
    warning "Não execute como root. Use sudo quando necessário."
    exit 1
fi

echo "⚠️  ATENÇÃO: Este script irá remover completamente:"
echo "   - Aplicação N.Crisis (/opt/ncrisis)"
echo "   - Serviços systemd relacionados"
echo "   - Configurações Nginx"
echo "   - Dados PostgreSQL (se especificado)"
echo "   - Configurações Redis"
echo ""
read -p "Deseja continuar? [y/N]: " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operação cancelada."
    exit 1
fi

# 1. Parar todos os serviços
log "Parando serviços N.Crisis..."
sudo systemctl stop ncrisis 2>/dev/null || true
sudo systemctl disable ncrisis 2>/dev/null || true

# 2. Remover serviço systemd
log "Removendo serviço systemd..."
sudo rm -f /etc/systemd/system/ncrisis.service
sudo systemctl daemon-reload

# 3. Remover aplicação
log "Removendo aplicação..."
sudo rm -rf /opt/ncrisis

# 4. Remover configurações Nginx
log "Limpando configurações Nginx..."
sudo rm -f /etc/nginx/sites-available/ncrisis*
sudo rm -f /etc/nginx/sites-enabled/ncrisis*
sudo rm -f /etc/nginx/sites-available/*.com
sudo rm -f /etc/nginx/sites-enabled/*.com

# Verificar se existe configuração padrão
if [ ! -f /etc/nginx/sites-enabled/default ]; then
    sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
fi

# Testar e recarregar Nginx
sudo nginx -t && sudo systemctl reload nginx 2>/dev/null || warning "Nginx não está rodando"

# 5. Limpar dados PostgreSQL (opcional)
echo ""
read -p "Deseja remover TODOS os dados PostgreSQL? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Removendo dados PostgreSQL..."
    sudo systemctl stop postgresql 2>/dev/null || true
    sudo -u postgres dropdb ncrisis 2>/dev/null || true
    sudo -u postgres dropuser ncrisis 2>/dev/null || true
    log "Dados PostgreSQL removidos"
else
    log "Dados PostgreSQL mantidos"
fi

# 6. Limpar configurações Redis
log "Limpando Redis..."
sudo systemctl stop redis-server 2>/dev/null || true

# Remover configurações customizadas do Redis
if [ -f /etc/redis/redis.conf ]; then
    sudo sed -i '/^requirepass/d' /etc/redis/redis.conf
fi

# 7. Limpar logs
log "Limpando logs..."
sudo journalctl --vacuum-time=1d 2>/dev/null || true
sudo rm -f /var/log/ncrisis-install.log

# 8. Limpar certificados SSL (opcional)
echo ""
read -p "Deseja remover certificados SSL Let's Encrypt? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Removendo certificados SSL..."
    sudo certbot delete --cert-name $(hostname -f) 2>/dev/null || true
    log "Certificados SSL removidos"
fi

# 9. Limpar arquivos temporários
log "Limpando arquivos temporários..."
rm -rf /tmp/ncrisis*
rm -rf ~/.npm/_cacache 2>/dev/null || true

# 10. Reiniciar serviços
log "Reiniciando serviços..."
sudo systemctl restart postgresql 2>/dev/null || true
sudo systemctl restart redis-server 2>/dev/null || true
sudo systemctl restart nginx 2>/dev/null || true

echo ""
echo "✅ Limpeza concluída com sucesso!"
echo ""
echo "📋 Resumo do que foi removido:"
echo "   ✓ Aplicação N.Crisis"
echo "   ✓ Serviço systemd"
echo "   ✓ Configurações Nginx"
echo "   ✓ Logs do sistema"
echo "   ✓ Arquivos temporários"
echo ""
echo "🔄 O ambiente está pronto para uma nova instalação"
echo "   Execute: ./install-fresh.sh seu-dominio.com"
echo ""
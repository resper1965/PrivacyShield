#!/bin/bash

# Fix Docker Compose issue
set -e

log() { echo "[$(date +'%H:%M:%S')] $*"; }

if [ "$EUID" -ne 0 ]; then echo "Execute como root"; exit 1; fi

log "Corrigindo Docker Compose..."

# Instalar docker-compose-plugin
apt update
apt install -y docker-compose-plugin

# Verificar se funcionou
docker compose version

# Ir para diretório da aplicação
cd /opt/ncrisis

log "Recriando containers com comando correto..."
docker compose down 2>/dev/null || true
docker compose up -d --build

log "Aguardando inicialização..."
sleep 90

log "Testando aplicação..."
for i in 1 2 3 4 5; do
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        log "N.Crisis funcionando!"
        break
    fi
    log "Tentativa $i/5..."
    sleep 30
done

log "Status dos containers:"
docker compose ps

log "Logs da aplicação:"
docker compose logs app --tail=20

echo
echo "=============================="
echo "      CORREÇÃO CONCLUÍDA"
echo "=============================="
echo "URL: https://monster.e-ness.com.br"
echo "Status: docker compose ps"
echo "Logs: docker compose logs -f"
echo "=============================="
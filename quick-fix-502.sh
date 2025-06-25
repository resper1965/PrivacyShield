#!/bin/bash

# Fix rápido para erro 502
# Execute na VPS: sudo bash quick-fix-502.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash quick-fix-502.sh"
    exit 1
fi

echo "=== FIX RÁPIDO 502 ==="

INSTALL_DIR="/opt/ncrisis"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não encontrado"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Reiniciando containers..."
docker compose restart

echo "2. Aguardando aplicação (60s)..."
for i in {1..12}; do
    sleep 5
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ App respondendo após $((i*5))s"
        break
    fi
    echo "Tentativa $i/12..."
done

echo "3. Se ainda não funcionar, rebuild completo..."
if ! curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "Fazendo rebuild..."
    docker compose down
    docker compose build --no-cache
    docker compose up -d
    
    echo "Aguardando rebuild (90s)..."
    for i in {1..18}; do
        sleep 5
        if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
            echo "✅ App respondendo após rebuild em $((i*5))s"
            break
        fi
        echo "Rebuild tentativa $i/18..."
    done
fi

echo "4. Reiniciando Nginx..."
systemctl restart nginx

echo "5. Teste final..."
sleep 5
echo "Interno: $(curl -sf http://localhost:5000/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Externo: $(curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

if curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1; then
    echo "✅ Erro 502 corrigido!"
else
    echo "❌ Erro 502 persiste - executar debug-502-error.sh"
fi
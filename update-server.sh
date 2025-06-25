#!/bin/bash

# Atualizar servidor para servir frontend na VPS
# Execute na VPS: sudo bash update-server.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash update-server.sh"
    exit 1
fi

echo "=== ATUALIZANDO SERVIDOR N.CRISIS ==="

INSTALL_DIR="/opt/ncrisis"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não encontrado"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Verificando frontend construído..."
if [ -d "frontend/dist" ] && [ -f "frontend/dist/index.html" ]; then
    echo "✅ Frontend já construído"
else
    echo "Construindo frontend..."
    cd frontend
    npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund
    npm run build
    cd ..
    
    if [ -f "frontend/dist/index.html" ]; then
        echo "✅ Frontend construído com sucesso"
    else
        echo "❌ Falha ao construir frontend"
        exit 1
    fi
fi

echo "2. Reconstruindo container com frontend..."
docker compose down
docker compose build --no-cache app
docker compose up -d

echo "3. Aguardando aplicação reinicializar..."
for i in {1..20}; do
    sleep 5
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ API ativa após $((i*5))s"
        break
    fi
    echo "Aguardando... $i/20"
done

echo "4. Testando frontend..."
# Testar se retorna HTML na raiz
RESPONSE=$(curl -s http://localhost:5000/ | head -1)
if echo "$RESPONSE" | grep -q "<!DOCTYPE\|<html"; then
    echo "✅ Frontend servindo HTML"
else
    echo "⚠️ Frontend pode não estar servindo corretamente"
    echo "Resposta: $RESPONSE"
fi

echo "5. Testando API..."
if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ API health OK"
else
    echo "❌ API health falhou"
fi

echo "6. Teste externo completo..."
echo "Frontend: $(curl -sf http://monster.e-ness.com.br/ >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "API: $(curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

echo "7. Logs da aplicação (últimas 10 linhas):"
docker compose logs app --tail=10

echo
echo "=== STATUS FINAL ==="
echo "URLs de acesso:"
echo "  Dashboard: http://monster.e-ness.com.br"
echo "  API Health: http://monster.e-ness.com.br/health" 
echo "  Upload API: http://monster.e-ness.com.br/api/v1/archives/upload"
echo
echo "Containers:"
docker compose ps

echo "=== ATUALIZAÇÃO CONCLUÍDA ==="
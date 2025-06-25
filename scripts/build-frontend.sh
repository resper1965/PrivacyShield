#!/bin/bash

# Build frontend para N.Crisis na VPS
# Execute na VPS: sudo bash build-frontend.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash build-frontend.sh"
    exit 1
fi

echo "=== CONSTRUINDO FRONTEND N.CRISIS ==="

INSTALL_DIR="/opt/ncrisis"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não encontrado"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Verificando estrutura do frontend..."
if [ -d "frontend" ]; then
    echo "✅ Diretório frontend encontrado"
    cd frontend
    
    if [ -f "package.json" ]; then
        echo "✅ package.json encontrado"
    else
        echo "❌ package.json não encontrado no frontend"
        exit 1
    fi
else
    echo "❌ Diretório frontend não encontrado"
    exit 1
fi

echo "2. Instalando dependências do frontend..."
npm install --omit=dev --no-audit --no-fund || npm install --no-audit --no-fund

echo "3. Construindo frontend..."
npm run build

if [ -d "dist" ] || [ -d "build" ]; then
    echo "✅ Frontend construído com sucesso"
    ls -la dist/ build/ 2>/dev/null | head -10
else
    echo "⚠️ Diretório de build não encontrado, mas pode ter sido construído em outro local"
fi

echo "4. Voltando para diretório raiz e reconstruindo containers..."
cd "$INSTALL_DIR"

# Rebuild container incluindo frontend
docker compose down
docker compose build --no-cache
docker compose up -d

echo "5. Aguardando aplicação reinicializar..."
sleep 60

echo "6. Testando aplicação completa..."
if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ API funcionando"
    
    # Testar se frontend está servindo
    if curl -sf http://localhost:5000/ | grep -q "html\|DOCTYPE\|<title>" 2>/dev/null; then
        echo "✅ Frontend servindo"
    else
        echo "⚠️ Frontend pode não estar servindo corretamente"
        echo "Resposta da raiz:"
        curl -s http://localhost:5000/ | head -5
    fi
else
    echo "❌ API não responde"
fi

echo "7. Teste externo..."
if curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1; then
    echo "✅ Acesso externo OK"
    
    # Verificar frontend externo
    echo "Testando frontend externo..."
    curl -s http://monster.e-ness.com.br/ | head -10
else
    echo "❌ Acesso externo falhou"
fi

echo
echo "=== STATUS FINAL ==="
echo "API Health: $(curl -sf http://localhost:5000/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Frontend: $(curl -sf http://localhost:5000/ >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Externo: $(curl -sf http://monster.e-ness.com.br/ >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

echo
echo "Containers ativos:"
docker compose ps

echo
echo "URLs de acesso:"
echo "  Dashboard: http://monster.e-ness.com.br"
echo "  API Health: http://monster.e-ness.com.br/health"
echo "  Upload: http://monster.e-ness.com.br/api/v1/archives/upload"

echo "=== BUILD FRONTEND CONCLUÍDO ==="
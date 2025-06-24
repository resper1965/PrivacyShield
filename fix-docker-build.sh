#!/bin/bash

# Fix Docker Build Issues for N.Crisis VPS
set -euo pipefail

readonly APP_DIR="/opt/ncrisis"

echo "=== N.Crisis Docker Build Fix ==="

cd "$APP_DIR"

# 1. Limpar builds anteriores
echo "Limpando builds anteriores..."
docker system prune -f
docker compose -f docker-compose.production.yml down --remove-orphans

# 2. Verificar e corrigir package-lock.json do frontend
echo "Verificando frontend package-lock.json..."
cd frontend
if [[ -f "package-lock.json" ]]; then
    echo "Removendo package-lock.json para evitar conflitos..."
    rm package-lock.json
fi

# Instalar dependências localmente primeiro para verificar
echo "Testando instalação npm local..."
npm install || {
    echo "Erro na instalação npm, tentando limpar cache..."
    npm cache clean --force
    rm -rf node_modules
    npm install
}

# Build local para testar
echo "Testando build local..."
npm run build || echo "Build local falhou, mas continuando..."

cd ..

# 3. Corrigir Dockerfile do frontend
echo "Corrigindo Dockerfile do frontend..."
sed -i 's/npm ci --only=production/npm install --production/g' frontend/Dockerfile

# 4. Construir apenas backend primeiro
echo "Construindo apenas backend..."
docker compose -f docker-compose.production.yml build backend

# 5. Se backend OK, construir frontend
echo "Construindo frontend..."
docker compose -f docker-compose.production.yml build frontend

# 6. Iniciar serviços
echo "Iniciando serviços..."
docker compose -f docker-compose.production.yml up -d

# 7. Verificar status
sleep 10
echo "Verificando status dos containers..."
docker ps

echo "Testando health check..."
curl -s http://localhost:5000/health && echo "✅ Backend OK" || echo "❌ Backend falhou"

echo "=== Fix concluído ==="
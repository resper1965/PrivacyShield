#!/bin/bash

# Corrigir erro de usuário nextjs no container
# Execute na VPS: sudo bash fix-nextjs-user-error.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash fix-nextjs-user-error.sh"
    exit 1
fi

echo "=== CORRIGINDO ERRO USUÁRIO NEXTJS ==="

INSTALL_DIR="/opt/ncrisis"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não encontrado"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Parando containers com problema..."
docker compose down --remove-orphans

echo "2. Removendo containers problemáticos..."
docker container prune -f

echo "3. Corrigindo Dockerfile..."
# Backup do Dockerfile atual
cp Dockerfile Dockerfile.backup

# Criar Dockerfile corrigido
cat > Dockerfile << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ncrisis -u 1001

# Copiar package files
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências como root
RUN npm ci --only=production || npm install --production

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p uploads tmp logs
RUN chown -R ncrisis:nodejs /app

# Expor porta
EXPOSE 5000

# Mudar para usuário não-root
USER ncrisis

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "const http = require('http'); const options = { host: 'localhost', port: 5000, path: '/health', timeout: 2000 }; const req = http.request(options, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"

# Comando de inicialização com múltiplos fallbacks
CMD ["sh", "-c", "if [ -d 'build' ]; then node build/src/server-simple.js; elif [ -f 'src/server-simple.ts' ]; then npx ts-node src/server-simple.ts; else npm start; fi"]
EOF

echo "4. Reconstruindo imagem sem cache..."
docker compose build --no-cache app

echo "5. Iniciando containers..."
docker compose up -d

echo "6. Aguardando aplicação inicializar..."
for i in {1..24}; do
    sleep 5
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Aplicação ativa após $((i*5))s"
        break
    fi
    echo "Tentativa $i/24..."
done

echo "7. Verificando status dos containers..."
docker compose ps

echo "8. Verificando logs da aplicação..."
docker compose logs --tail=10 app

echo "9. Testando conectividade..."
echo "Health interno: $(curl -sf http://localhost:5000/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Health externo: $(curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

echo
echo "=== CORREÇÃO CONCLUÍDA ==="

if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Erro de usuário nextjs corrigido!"
    echo "🌐 App: http://monster.e-ness.com.br"
    echo "🏥 Health: http://monster.e-ness.com.br/health"
else
    echo "❌ Aplicação ainda não está respondendo"
    echo "📊 Logs: docker compose logs app"
    echo "📋 Status: docker compose ps"
fi
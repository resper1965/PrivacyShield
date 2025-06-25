#!/bin/bash

# Corrigir erro de configuração env.ts
# Execute na VPS: sudo bash fix-env-config-error.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash fix-env-config-error.sh"
    exit 1
fi

echo "=== CORRIGINDO ERRO ENV.TS ==="

INSTALL_DIR="/opt/ncrisis"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não encontrado"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Verificando .env atual..."
if [ -f ".env" ]; then
    echo "Conteúdo atual do .env:"
    cat .env
else
    echo "Arquivo .env não encontrado, criando..."
fi

echo
echo "2. Criando .env completo..."
cat > .env << 'EOF'
# N.Crisis Environment Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://ncrisis_user:ncrisis_db_password_2025@postgres:5432/ncrisis_db

# Redis Configuration
REDIS_URL=redis://redis:6379

# OpenAI Configuration (opcional)
OPENAI_API_KEY=sk-configure-later

# SendGrid Configuration (opcional)
SENDGRID_API_KEY=SG.configure-later

# CORS Configuration
DOMAIN=monster.e-ness.com.br
CORS_ORIGINS=https://monster.e-ness.com.br,http://monster.e-ness.com.br

# Security
SESSION_SECRET=ncrisis-secure-session-2025

# File Upload
MAX_FILE_SIZE=100MB
UPLOAD_PATH=/app/uploads

# ClamAV (opcional)
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310

# Logging
LOG_LEVEL=info
EOF

echo "3. Verificando se env.ts existe..."
if [ ! -f "src/config/env.ts" ]; then
    echo "Criando env.ts básico..."
    mkdir -p src/config
    cat > src/config/env.ts << 'EOF'
/**
 * Environment Configuration
 * Loads and validates environment variables
 */

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  HOST: process.env.HOST || '0.0.0.0',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://ncrisis_user:ncrisis_db_password_2025@localhost:5432/ncrisis_db',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Optional APIs
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  
  // CORS
  DOMAIN: process.env.DOMAIN || 'localhost',
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:3000',
  
  // Security
  SESSION_SECRET: process.env.SESSION_SECRET || 'default-secret',
  
  // File Upload
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '100MB',
  UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
  
  // ClamAV
  CLAMAV_HOST: process.env.CLAMAV_HOST || '127.0.0.1',
  CLAMAV_PORT: parseInt(process.env.CLAMAV_PORT || '3310', 10),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

export default env;
EOF
fi

echo "4. Removendo version obsoleta do docker-compose.yml..."
sed -i '/^version:/d' docker-compose.yml

echo "5. Reconstruindo aplicação..."
docker compose down
docker compose build --no-cache app
docker compose up -d

echo "6. Aguardando aplicação (120s)..."
for i in {1..24}; do
    sleep 5
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Aplicação ativa após $((i*5))s"
        break
    fi
    echo "Tentativa $i/24... $(docker compose ps --format 'table {{.Service}}\t{{.State}}')"
done

echo "7. Verificando logs em caso de erro..."
if ! curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "Logs da aplicação:"
    docker compose logs --tail=20 app
fi

echo "8. Status final..."
docker compose ps

echo "9. Testando conectividade..."
echo "Health interno: $(curl -sf http://localhost:5000/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Health externo: $(curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

echo
echo "=== CORREÇÃO ENV CONCLUÍDA ==="

if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Erro de configuração corrigido!"
    echo "🌐 App: http://monster.e-ness.com.br"
    echo "🏥 Health: http://monster.e-ness.com.br/health"
else
    echo "❌ Aplicação ainda com problemas"
    echo "📊 Debug: docker compose logs app"
fi
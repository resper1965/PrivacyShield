#!/bin/bash

# N.Crisis Quick Start - Bypass Docker Issues
# Inicia aplicação diretamente no VPS

set -euo pipefail

echo "=== N.Crisis Quick Start ==="

cd /opt/ncrisis

# 1. Matar processos existentes
pkill -f "node.*server-simple" 2>/dev/null || true
pkill -f "ts-node.*server-simple" 2>/dev/null || true

# 2. Configurar PostgreSQL se necessário
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw ncrisis; then
    echo "Configurando PostgreSQL..."
    sudo -u postgres psql -c "CREATE USER ncrisis WITH ENCRYPTED PASSWORD 'ncrisis123';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE ncrisis OWNER ncrisis;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ncrisis TO ncrisis;" 2>/dev/null || true
fi

# 3. Criar .env se não existe
if [[ ! -f ".env" ]]; then
    echo "Criando .env..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis:ncrisis123@localhost:5432/ncrisis
CORS_ORIGINS=https://monster.e-ness.com.br,http://monster.e-ness.com.br:5000,http://localhost:5000
EOF
fi

# 4. Instalar dependências
echo "Instalando dependências..."
npm install --production

# 5. Inicializar banco se necessário
if command -v npx &> /dev/null; then
    echo "Configurando banco de dados..."
    DATABASE_URL=postgresql://ncrisis:ncrisis123@localhost:5432/ncrisis npx prisma generate 2>/dev/null || true
    DATABASE_URL=postgresql://ncrisis:ncrisis123@localhost:5432/ncrisis npx prisma db push 2>/dev/null || true
fi

# 6. Criar diretórios necessários
mkdir -p uploads logs tmp local_files shared_folders
chown -R ncrisis:ncrisis uploads logs tmp local_files shared_folders

# 7. Configurar firewall
ufw allow 5000/tcp 2>/dev/null || true

# 8. Criar e configurar arquivo de log
LOG_FILE="/tmp/ncrisis-quick.log"
touch "$LOG_FILE"
chown ncrisis:ncrisis "$LOG_FILE"

# 9. Iniciar aplicação
echo "Iniciando N.Crisis na porta 5000..."

sudo -u ncrisis bash -c "
cd /opt/ncrisis
export NODE_ENV=production
export PORT=5000
export HOST=0.0.0.0
export DATABASE_URL=postgresql://ncrisis:ncrisis123@localhost:5432/ncrisis
nohup ts-node src/server-simple.ts > $LOG_FILE 2>&1 &
echo \$! > /tmp/ncrisis.pid
"

# 10. Aguardar e verificar
sleep 5

if pgrep -f "ts-node.*server-simple" > /dev/null; then
    echo "✅ N.Crisis iniciado com sucesso!"
    echo "PID: $(cat /tmp/ncrisis.pid 2>/dev/null)"
    
    # Teste de conectividade
    if curl -s http://localhost:5000/health > /dev/null; then
        echo "✅ Health check OK"
        echo "🚀 Acesse: http://monster.e-ness.com.br:5000"
    else
        echo "⚠️ Health check falhou, mas processo está rodando"
        echo "Aguarde alguns segundos e teste novamente"
    fi
else
    echo "❌ Falha ao iniciar. Logs:"
    tail -10 "$LOG_FILE" 2>/dev/null || echo "Log file não encontrado"
fi

echo "Logs: tail -f $LOG_FILE"
echo "Status: curl http://localhost:5000/health"
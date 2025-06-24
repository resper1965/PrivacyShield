#!/bin/bash

# N.Crisis Start Now - Correção rápida de permissões
set -euo pipefail

cd /opt/ncrisis

echo "=== N.Crisis Start Now ==="

# 1. Parar processos existentes
pkill -f "ts-node.*server-simple" 2>/dev/null || true
sleep 2

# 2. Criar log em local acessível
LOG_FILE="/tmp/ncrisis.log"
touch "$LOG_FILE"
chmod 666 "$LOG_FILE"

# 3. Verificar se .env existe
if [[ ! -f ".env" ]]; then
    cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis:ncrisis123@localhost:5432/ncrisis
CORS_ORIGINS=https://monster.e-ness.com.br,http://monster.e-ness.com.br:5000
EOF
fi

# 4. Iniciar aplicação diretamente
echo "Iniciando aplicação..."

sudo -u ncrisis bash -c "
cd /opt/ncrisis
export NODE_ENV=production
export PORT=5000
export HOST=0.0.0.0
nohup ts-node src/server-simple.ts > $LOG_FILE 2>&1 &
echo \$! > /tmp/ncrisis.pid
"

# 5. Aguardar inicialização
echo "Aguardando inicialização..."
sleep 8

# 6. Verificar se está rodando
if pgrep -f "ts-node.*server-simple" > /dev/null; then
    PID=$(cat /tmp/ncrisis.pid 2>/dev/null || echo "unknown")
    echo "✅ N.Crisis iniciado! PID: $PID"
    
    # Testar conexão
    echo "Testando conexão..."
    sleep 2
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        echo "✅ Health check OK!"
        echo "🚀 Aplicação rodando em http://monster.e-ness.com.br:5000"
    else
        echo "⚠️ Health check falhou, mas processo está ativo"
        echo "Aguarde mais alguns segundos..."
    fi
else
    echo "❌ Falha ao iniciar"
    echo ""
    echo "Logs do erro:"
    cat "$LOG_FILE" 2>/dev/null || echo "Sem logs disponíveis"
    exit 1
fi

echo ""
echo "Comandos úteis:"
echo "  Status: curl http://localhost:5000/health"
echo "  Logs: tail -f $LOG_FILE"
echo "  Parar: pkill -f 'ts-node.*server-simple'"
echo "  PID: cat /tmp/ncrisis.pid"
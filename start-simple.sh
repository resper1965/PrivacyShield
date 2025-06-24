#!/bin/bash

# N.Crisis Simple Startup - Sem Docker
# Para quando Docker está com problemas

set -euo pipefail

readonly APP_DIR="/opt/ncrisis"

echo "=== N.Crisis Simple Startup ==="

cd "$APP_DIR"

# 1. Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado"
    echo "Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js: $(node --version)"
echo "✅ NPM: $(npm --version)"

# 2. Parar processos existentes
echo "Parando processos existentes..."
pkill -f "node.*server-simple" || true
pkill -f "ts-node.*server-simple" || true

# 3. Instalar dependências
echo "Instalando dependências do backend..."
npm install

# 4. Compilar TypeScript se necessário
if [[ -f "tsconfig.json" ]] && [[ ! -d "build" ]]; then
    echo "Compilando TypeScript..."
    npm run build
fi

# 5. Configurar ambiente
if [[ ! -f ".env" ]]; then
    echo "Criando arquivo .env..."
    cp .env.example .env
    
    # Configurações básicas para VPS
    cat >> .env << EOF

# VPS Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database (usar PostgreSQL do sistema)
DATABASE_URL=postgresql://ncrisis:ncrisis123@localhost:5432/ncrisis

# CORS
CORS_ORIGINS=https://monster.e-ness.com.br,http://monster.e-ness.com.br:5000
EOF
fi

# 6. Configurar database PostgreSQL
echo "Configurando PostgreSQL..."
sudo -u postgres psql -c "CREATE USER ncrisis WITH ENCRYPTED PASSWORD 'ncrisis123';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE ncrisis OWNER ncrisis;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ncrisis TO ncrisis;" 2>/dev/null || true

# 7. Inicializar banco se necessário
if command -v npx &> /dev/null && [[ -f "prisma/schema.prisma" ]]; then
    echo "Inicializando banco de dados..."
    npx prisma generate || true
    npx prisma db push || true
fi

# 8. Iniciar aplicação
echo "Iniciando N.Crisis..."
echo "Logs em: /var/log/ncrisis-app.log"

# Criar log file
sudo touch /var/log/ncrisis-app.log
sudo chown ncrisis:ncrisis /var/log/ncrisis-app.log

# Iniciar em background
sudo -u ncrisis bash -c "
    cd '$APP_DIR'
    export NODE_ENV=production
    export PORT=5000
    export HOST=0.0.0.0
    nohup ts-node src/server-simple.ts > /var/log/ncrisis-app.log 2>&1 &
    echo \$! > /var/run/ncrisis.pid
"

sleep 3

# 9. Verificar se iniciou
if pgrep -f "ts-node.*server-simple" > /dev/null; then
    echo "✅ N.Crisis iniciado com sucesso!"
    echo "PID: $(cat /var/run/ncrisis.pid 2>/dev/null || echo 'N/A')"
else
    echo "❌ Falha ao iniciar N.Crisis"
    echo "Verificar logs: tail -f /var/log/ncrisis-app.log"
    exit 1
fi

# 10. Testar conexão
echo "Testando conexão..."
sleep 2
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ Health check OK"
    echo "🚀 N.Crisis rodando em http://monster.e-ness.com.br:5000"
else
    echo "❌ Health check falhou"
    echo "Logs: tail -f /var/log/ncrisis-app.log"
fi

# 11. Configurar systemd service (opcional)
cat > /tmp/ncrisis.service << EOF
[Unit]
Description=N.Crisis PII Detection Service
After=network.target

[Service]
Type=forking
User=ncrisis
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/ts-node src/server-simple.ts
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=HOST=0.0.0.0

[Install]
WantedBy=multi-user.target
EOF

echo ""
echo "Para instalar como serviço do sistema:"
echo "sudo mv /tmp/ncrisis.service /etc/systemd/system/"
echo "sudo systemctl enable ncrisis"
echo "sudo systemctl start ncrisis"

echo ""
echo "=== Startup Simple Concluído ==="
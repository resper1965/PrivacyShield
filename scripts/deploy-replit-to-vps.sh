#!/bin/bash

# Deploy da versão Replit para VPS
# Execute na VPS: curl -fsSL [URL_DESTE_SCRIPT] | sudo bash

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash deploy-replit-to-vps.sh"
    exit 1
fi

echo "=== DEPLOY REPLIT → VPS ==="

DOMAIN="monster.e-ness.com.br"
INSTALL_DIR="/opt/ncrisis"
GITHUB_REPO="https://github.com/resper1965/PrivacyShield.git"

echo "1. Parando aplicação atual..."
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    docker compose down 2>/dev/null || true
fi

echo "2. Backup da configuração atual..."
if [ -f "$INSTALL_DIR/.env" ]; then
    cp "$INSTALL_DIR/.env" "/tmp/ncrisis-env.backup"
    echo "✅ Backup do .env salvo"
fi

echo "3. Atualizando código do GitHub..."
if [ -d "$INSTALL_DIR" ]; then
    cd "$INSTALL_DIR"
    git fetch origin
    git reset --hard origin/main
    echo "✅ Código atualizado"
else
    echo "❌ Diretório não encontrado, clonando..."
    git clone "$GITHUB_REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

echo "4. Restaurando configuração..."
if [ -f "/tmp/ncrisis-env.backup" ]; then
    cp "/tmp/ncrisis-env.backup" "$INSTALL_DIR/.env"
    echo "✅ Configuração restaurada"
else
    echo "Criando .env padrão..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis_user:ncrisis_db_password_2025@postgres:5432/ncrisis_db
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-configure-later
DOMAIN=monster.e-ness.com.br
CORS_ORIGINS=https://monster.e-ness.com.br
EOF
fi

echo "5. Construindo frontend..."
if [ -d "frontend" ]; then
    cd frontend
    npm install
    npm run build
    cd ..
    
    if [ -f "frontend/dist/index.html" ]; then
        echo "✅ Frontend construído"
    else
        echo "⚠️ Frontend não construído, mas continuando..."
    fi
fi

echo "6. Reconstruindo containers..."
docker compose build --no-cache
docker compose up -d

echo "7. Aguardando inicialização..."
for i in {1..24}; do
    sleep 5
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Aplicação ativa após $((i*5))s"
        break
    fi
    echo "Tentativa $i/24..."
done

echo "8. Configurando Nginx..."
cat > /etc/nginx/sites-available/ncrisis << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 100M;
    
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
    
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
    
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo "9. Teste final..."
sleep 5
echo "API: $(curl -sf http://${DOMAIN}/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Frontend: $(curl -sf http://${DOMAIN}/ >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

echo
echo "=== DEPLOY CONCLUÍDO ==="
echo "🌐 Acesso: http://${DOMAIN}"
echo "🏥 Health: http://${DOMAIN}/health"
echo "📋 Status: cd ${INSTALL_DIR} && docker compose ps"
echo "📊 Logs: cd ${INSTALL_DIR} && docker compose logs -f app"

echo "✅ Deploy da versão Replit finalizado!"
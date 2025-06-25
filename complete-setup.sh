#!/bin/bash

# Setup completo final N.Crisis na VPS
# Execute na VPS: sudo bash complete-setup.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash complete-setup.sh"
    exit 1
fi

echo "=== SETUP COMPLETO FINAL N.CRISIS ==="

DOMAIN="monster.e-ness.com.br"
INSTALL_DIR="/opt/ncrisis"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não encontrado"
    echo "Execute primeiro o install-vps-simples.sh"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Verificando e construindo frontend se necessário..."
if [ ! -d "frontend/dist" ] || [ ! -f "frontend/dist/index.html" ]; then
    echo "Construindo frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    
    if [ -f "frontend/dist/index.html" ]; then
        echo "✅ Frontend construído"
    else
        echo "❌ Falha ao construir frontend"
        exit 1
    fi
else
    echo "✅ Frontend já construído"
fi

echo "2. Atualizando containers com frontend..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo "3. Aguardando inicialização completa..."
for i in {1..30}; do
    sleep 5
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Aplicação ativa após $((i*5))s"
        break
    fi
    echo "Aguardando... $i/30"
done

echo "4. Verificando todos os serviços..."

# API Health
if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ API Health"
else
    echo "❌ API Health falhou"
fi

# Frontend
FRONTEND_TEST=$(curl -s http://localhost:5000/ | head -1)
if echo "$FRONTEND_TEST" | grep -q "<!DOCTYPE\|<html"; then
    echo "✅ Frontend HTML"
else
    echo "⚠️ Frontend retornando: $(echo $FRONTEND_TEST | cut -c1-50)..."
fi

# WebSocket
if curl -sf http://localhost:5000/socket.io/ >/dev/null 2>&1; then
    echo "✅ WebSocket"
else
    echo "❌ WebSocket falhou"
fi

# Endpoints específicos
echo "✅ Endpoints ativos:"
curl -s http://localhost:5000/health | grep -o '"status":"[^"]*"' || echo "- Health endpoint"
echo "- Upload: /api/v1/archives/upload"
echo "- Reports: /api/v1/reports/detections"
echo "- Chat: /api/v1/chat"
echo "- Search: /api/v1/search"
echo "- Embeddings: /api/v1/embeddings"

echo "5. Configurando Nginx para servir frontend corretamente..."
cat > /etc/nginx/sites-available/ncrisis << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    client_max_body_size 100M;
    
    # Logs
    access_log /var/log/nginx/ncrisis_access.log;
    error_log /var/log/nginx/ncrisis_error.log;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Block sensitive files
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
    
    # API routes
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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
    
    # Frontend - everything else
    location / {
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
}
EOF

nginx -t && systemctl reload nginx

echo "6. Teste final externo..."
sleep 5

echo "Frontend: $(curl -sf http://${DOMAIN}/ >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "API: $(curl -sf http://${DOMAIN}/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Upload: $(curl -sf http://${DOMAIN}/api/v1/archives/upload >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "WebSocket: $(curl -sf http://${DOMAIN}/socket.io/ >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

echo
echo "=== N.CRISIS SETUP COMPLETO ==="
echo "🌐 Acesso principal: http://${DOMAIN}"
echo "🏥 Health check: http://${DOMAIN}/health"
echo "📤 Upload API: http://${DOMAIN}/api/v1/archives/upload"
echo "📊 Reports: http://${DOMAIN}/api/v1/reports/detections"
echo "🤖 Chat IA: http://${DOMAIN}/api/v1/chat"
echo "🔍 Search: http://${DOMAIN}/api/v1/search"
echo "🔌 WebSocket: http://${DOMAIN}/socket.io/"
echo
echo "📁 Logs:"
echo "  Aplicação: cd ${INSTALL_DIR} && docker compose logs -f app"
echo "  Nginx: tail -f /var/log/nginx/ncrisis_error.log"
echo
echo "🔧 Manutenção:"
echo "  Status: cd ${INSTALL_DIR} && docker compose ps"
echo "  Restart: cd ${INSTALL_DIR} && docker compose restart"
echo "  Rebuild: cd ${INSTALL_DIR} && docker compose up -d --build"
echo
echo "✅ Instalação completa!"
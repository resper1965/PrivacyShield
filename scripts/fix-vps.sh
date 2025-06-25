#!/bin/bash

# Script de correção rápida N.Crisis VPS
# Execute: sudo bash fix-vps.sh

set -e

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash fix-vps.sh"
    exit 1
fi

echo "=== CORREÇÃO RÁPIDA N.CRISIS ==="

INSTALL_DIR="/opt/ncrisis"

# Ir para diretório da aplicação
if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não existe!"
    echo "Execute primeiro: curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/install-vps-simples.sh | sudo bash"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Parando containers..."
docker compose down 2>/dev/null || true

echo "2. Limpando containers antigos..."
docker system prune -f

echo "3. Verificando arquivos necessários..."
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml não encontrado!"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "Criando .env..."
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

echo "4. Reconstruindo aplicação..."
docker compose build --no-cache

echo "5. Iniciando containers..."
docker compose up -d

echo "6. Aguardando aplicação (2 minutos)..."
sleep 120

echo "7. Testando aplicação..."
for i in 1 2 3 4 5; do
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Aplicação funcionando!"
        break
    fi
    echo "Tentativa $i/5 - aguardando 30s..."
    sleep 30
done

echo "8. Status dos containers:"
docker compose ps

echo "9. Configurando Nginx..."
systemctl start nginx 2>/dev/null || true

# Criar configuração simples HTTP
cat > /etc/nginx/sites-available/ncrisis << 'EOF'
server {
    listen 80;
    server_name monster.e-ness.com.br;
    client_max_body_size 100M;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

echo "10. Testando acesso..."
curl -sf http://monster.e-ness.com.br/health && echo "✅ HTTP funcionando!" || echo "❌ HTTP com problemas"

echo
echo "=== STATUS FINAL ==="
echo "Aplicação local: http://localhost:5000/health"
echo "Acesso externo:  http://monster.e-ness.com.br/health"
echo
echo "Comandos úteis:"
echo "  Status:    cd $INSTALL_DIR && docker compose ps"
echo "  Logs:      cd $INSTALL_DIR && docker compose logs -f app"
echo "  Restart:   cd $INSTALL_DIR && docker compose restart"
echo "  Rebuild:   cd $INSTALL_DIR && docker compose up -d --build"
echo
echo "Para SSL: certbot --nginx -d monster.e-ness.com.br --non-interactive --agree-tos --email admin@e-ness.com.br"
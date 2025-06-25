#!/bin/bash

# Correção URGENTE - Nginx porta errada
# Execute: sudo bash fix-urgente.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash fix-urgente.sh"
    exit 1
fi

echo "=== CORREÇÃO URGENTE NGINX ==="

# Parar Nginx
systemctl stop nginx

# Remover todas as configurações do Nginx
rm -f /etc/nginx/sites-enabled/*
rm -f /etc/nginx/sites-available/ncrisis*

# Criar configuração correta do zero
cat > /etc/nginx/sites-available/ncrisis << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name monster.e-ness.com.br _;
    client_max_body_size 100M;
    
    # Bloquear arquivos perigosos
    location ~ /\.(env|git|htaccess) {
        deny all;
        return 404;
    }
    
    # Proxy para aplicação N.Crisis na porta 5000
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
    }
    
    # Health check específico
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_set_header Host $host;
        access_log off;
    }
    
    # Logs customizados
    access_log /var/log/nginx/ncrisis_access.log;
    error_log /var/log/nginx/ncrisis_error.log;
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/

# Verificar se app está rodando
echo "Verificando aplicação na porta 5000..."
if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ App na porta 5000 OK"
else
    echo "❌ App não responde - iniciando containers..."
    if [ -d "/opt/ncrisis" ]; then
        cd /opt/ncrisis
        docker compose down
        docker compose up -d
        echo "Aguardando aplicação inicializar..."
        for i in {1..12}; do
            sleep 10
            if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
                echo "✅ App iniciada após ${i}0s"
                break
            fi
            echo "Tentativa $i/12..."
        done
    fi
fi

# Testar configuração Nginx
echo "Testando configuração Nginx..."
if nginx -t; then
    echo "✅ Configuração válida"
else
    echo "❌ Erro na configuração Nginx!"
    nginx -t
    exit 1
fi

# Iniciar Nginx
systemctl start nginx
systemctl enable nginx

echo "Aguardando Nginx estabilizar..."
sleep 5

# Teste final
echo "=== TESTE FINAL ==="
echo "1. App local:"
curl -sf http://localhost:5000/health && echo "✅ OK" || echo "❌ FALHOU"

echo "2. Proxy local:"
curl -sf http://localhost/health && echo "✅ OK" || echo "❌ FALHOU"

echo "3. Acesso externo:"
curl -sf http://monster.e-ness.com.br/health && echo "✅ OK" || echo "❌ FALHOU"

echo
echo "Status dos serviços:"
systemctl is-active nginx && echo "Nginx: ATIVO" || echo "Nginx: INATIVO"

if [ -d "/opt/ncrisis" ]; then
    cd /opt/ncrisis
    docker compose ps | grep -q "Up" && echo "Containers: ATIVOS" || echo "Containers: INATIVOS"
fi

echo
echo "Se ainda houver problemas, execute:"
echo "  tail -f /var/log/nginx/ncrisis_error.log"
echo "  cd /opt/ncrisis && docker compose logs app -f"

echo "=== CORREÇÃO CONCLUÍDA ==="
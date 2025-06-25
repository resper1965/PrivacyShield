#!/bin/bash

# Correção do problema de porta Nginx
# O erro mostra upstream: http://127.0.0.1:8000 mas app roda na 5000

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash fix-nginx-port.sh"
    exit 1
fi

echo "=== CORRIGINDO PORTA NGINX ==="

# Corrigir configuração do Nginx
cat > /etc/nginx/sites-available/ncrisis << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name monster.e-ness.com.br;
    client_max_body_size 100M;
    
    # Bloquear acesso a arquivos sensíveis
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
    
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
    }
    
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
EOF

echo "1. Configuração Nginx corrigida (porta 8000 → 5000)"

# Ativar configuração
ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

echo "2. Testando configuração..."
if nginx -t; then
    echo "✅ Configuração válida"
else
    echo "❌ Erro na configuração"
    exit 1
fi

echo "3. Recarregando Nginx..."
systemctl reload nginx

echo "4. Verificando se aplicação está rodando na porta 5000..."
if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Aplicação na porta 5000 OK"
else
    echo "❌ Aplicação não responde na porta 5000"
    echo "Iniciando containers..."
    
    if [ -d "/opt/ncrisis" ]; then
        cd /opt/ncrisis
        docker compose up -d
        echo "Aguardando 60s..."
        sleep 60
        
        if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
            echo "✅ Aplicação iniciada com sucesso"
        else
            echo "❌ Aplicação ainda não responde"
            echo "Logs da aplicação:"
            docker compose logs app --tail=10
        fi
    else
        echo "❌ Diretório /opt/ncrisis não encontrado"
    fi
fi

echo "5. Testando acesso externo..."
sleep 5
if curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1; then
    echo "✅ Acesso externo funcionando!"
    curl -s http://monster.e-ness.com.br/health | jq . 2>/dev/null || curl -s http://monster.e-ness.com.br/health
else
    echo "❌ Acesso externo ainda com problemas"
    echo "Verificando logs do Nginx..."
    tail -5 /var/log/nginx/error.log
fi

echo
echo "=== TESTE FINAL ==="
echo "Status Nginx: $(systemctl is-active nginx)"
echo "Status App:   $(curl -sf http://localhost:5000/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Teste HTTP:   $(curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo
echo "Se ainda não funcionar, execute:"
echo "  cd /opt/ncrisis && docker compose logs app"
echo "  systemctl status nginx"
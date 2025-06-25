#!/bin/bash

# Resolver conflitos de porta 80
echo "=== RESOLVENDO CONFLITOS PORTA 80 ==="

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash fix-port-conflict.sh"
    exit 1
fi

echo "1. Parando todos os serviços web..."
systemctl stop nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl stop httpd 2>/dev/null || true
systemctl stop lighttpd 2>/dev/null || true

echo "2. Matando processos na porta 80..."
fuser -k 80/tcp 2>/dev/null || true
sleep 5

echo "3. Verificando se porta 80 está livre..."
if netstat -tlnp 2>/dev/null | grep -q ":80 " || ss -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "❌ Porta 80 ainda ocupada!"
    echo "Processos usando porta 80:"
    netstat -tlnp | grep ":80 " || ss -tlnp | grep ":80 "
    echo
    echo "Tentando matar forçadamente..."
    lsof -ti:80 | xargs kill -9 2>/dev/null || true
    sleep 3
fi

echo "4. Desabilitando Apache permanentemente..."
systemctl disable apache2 2>/dev/null || true
systemctl mask apache2 2>/dev/null || true

echo "5. Reconfigurando Nginx do zero..."
rm -rf /etc/nginx/sites-enabled/*
rm -rf /etc/nginx/sites-available/default*

# Configuração limpa do Nginx
cat > /etc/nginx/sites-available/ncrisis << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name monster.e-ness.com.br;
    client_max_body_size 100M;
    
    # Logs específicos
    access_log /var/log/nginx/ncrisis.access.log;
    error_log /var/log/nginx/ncrisis.error.log;
    
    # Bloquear arquivos sensíveis
    location ~ /\.(env|git) {
        deny all;
        return 404;
    }
    
    # Proxy para N.Crisis
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
        
        # Headers adicionais para debugging
        add_header X-Proxy-Cache $upstream_cache_status;
        add_header X-Served-By nginx;
    }
}
EOF

# Ativar configuração
ln -sf /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/

echo "6. Verificando aplicação N.Crisis..."
if [ -d "/opt/ncrisis" ]; then
    cd /opt/ncrisis
    
    # Verificar se containers estão rodando
    if ! docker compose ps | grep -q "Up"; then
        echo "Iniciando containers N.Crisis..."
        docker compose down
        docker compose up -d
        
        echo "Aguardando aplicação (2 minutos)..."
        for i in {1..24}; do
            sleep 5
            if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
                echo "✅ Aplicação respondendo após $((i*5))s"
                break
            fi
            echo "Tentativa $i/24..."
        done
    fi
    
    echo "Status dos containers:"
    docker compose ps
else
    echo "❌ Diretório /opt/ncrisis não encontrado!"
    exit 1
fi

echo "7. Testando configuração e iniciando Nginx..."
if nginx -t; then
    echo "✅ Configuração Nginx válida"
    systemctl start nginx
    systemctl enable nginx
    sleep 3
else
    echo "❌ Erro na configuração Nginx"
    nginx -t
    exit 1
fi

echo "8. Teste final completo..."
echo "App local (5000): $(curl -sf http://localhost:5000/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Proxy local (80): $(curl -sf http://localhost/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Acesso externo:   $(curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

echo
echo "Status final:"
echo "Nginx: $(systemctl is-active nginx)"
echo "Porta 80: $(ss -tln | grep -q :80 && echo 'aberta' || echo 'fechada')"
echo "Porta 5000: $(ss -tln | grep -q :5000 && echo 'aberta' || echo 'fechada')"

echo
echo "Se ainda não funcionar:"
echo "  tail -f /var/log/nginx/ncrisis.error.log"
echo "  cd /opt/ncrisis && docker compose logs app -f"

echo "=== CORREÇÃO DE CONFLITOS CONCLUÍDA ==="
#!/bin/bash

# Fix Nginx Configuration Conflict
# Resolve o erro: limit_req_zone "api" is already bound

echo "🔧 Corrigindo conflito de configuração Nginx"
echo "============================================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Execute como root: sudo bash"
   exit 1
fi

# Remove conflicting configuration files
echo "Removendo configurações conflitantes..."
rm -f /etc/nginx/conf.d/piidetector-limits.conf
rm -f /etc/nginx/conf.d/default.conf
rm -f /etc/nginx/sites-enabled/default

# Create clean nginx.conf without conflicting directives
echo "Criando configuração limpa do Nginx..."
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    # Basic Settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Rate limiting (defined only once)
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=2r/s;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Logging Settings
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_size "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Gzip Settings
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Virtual Host Configs
    include /etc/nginx/sites-enabled/*;
}
EOF

# Create site configuration for monster.e-ness.com.br
echo "Criando configuração do site..."
cat > /etc/nginx/sites-available/monster.e-ness.com.br << 'EOF'
server {
    listen 80;
    server_name monster.e-ness.com.br;
    
    # Rate limiting
    limit_req zone=api burst=20 nodelay;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Large file uploads
    client_max_body_size 100M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    
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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        access_log off;
    }
}
EOF

# Enable site
echo "Ativando site..."
ln -sf /etc/nginx/sites-available/monster.e-ness.com.br /etc/nginx/sites-enabled/

# Test nginx configuration
echo "Testando configuração do Nginx..."
if nginx -t; then
    echo "✅ Configuração válida"
    systemctl reload nginx
    echo "✅ Nginx recarregado com sucesso"
else
    echo "❌ Ainda há erros na configuração"
    nginx -t
    exit 1
fi

# Now fix the N.Crisis service
echo ""
echo "Corrigindo serviço N.Crisis..."

# Stop any running instances
systemctl stop ncrisis 2>/dev/null || echo "Serviço já parado"
pkill -f "node.*ncrisis" 2>/dev/null || echo "Nenhum processo Node encontrado"

# Create proper systemd service
cat > /etc/systemd/system/ncrisis.service << 'EOF'
[Unit]
Description=N.Crisis PII Detection Platform
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=ncrisis
Group=ncrisis
WorkingDirectory=/opt/ncrisis
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=HOST=0.0.0.0
ExecStartPre=/bin/sleep 10
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=15
TimeoutStartSec=180
TimeoutStopSec=30
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ncrisis

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/ncrisis/uploads /opt/ncrisis/logs /tmp

[Install]
WantedBy=multi-user.target
EOF

# Fix permissions and ownership
echo "Corrigindo permissões..."
cd /opt/ncrisis
chown -R ncrisis:ncrisis /opt/ncrisis

# Create .env if missing
if [[ ! -f .env ]]; then
    echo "Criando arquivo .env..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis:Vk7yTXpTuI4DqtcwfAiB4O2ry@localhost:5432/ncrisis
REDIS_URL=redis://default:mSSM36aywmQ1qPdKnT8GiJf5x@localhost:6379
CORS_ORIGINS=https://monster.e-ness.com.br,http://monster.e-ness.com.br
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/opt/ncrisis/uploads
APP_URL=https://monster.e-ness.com.br
APP_NAME=N.Crisis
EOF
    chown ncrisis:ncrisis .env
    chmod 600 .env
fi

# Create required directories
mkdir -p uploads logs tmp
chown -R ncrisis:ncrisis uploads logs tmp

# Install dependencies if needed
if [[ ! -d node_modules ]]; then
    echo "Instalando dependências..."
    sudo -u ncrisis npm install --production
fi

# Initialize database
echo "Inicializando banco de dados..."
sudo -u ncrisis npm run db:push 2>/dev/null || echo "Banco já inicializado"

# Reload and restart services
echo "Reiniciando serviços..."
systemctl daemon-reload
systemctl enable ncrisis
systemctl restart postgresql
systemctl restart redis-server
systemctl restart nginx
systemctl start ncrisis

# Wait for services to start
echo "Aguardando inicialização..."
sleep 20

# Check status
echo ""
echo "📊 Status dos Serviços:"
systemctl is-active postgresql && echo "   ✅ PostgreSQL: Ativo" || echo "   ❌ PostgreSQL: Inativo"
systemctl is-active redis-server && echo "   ✅ Redis: Ativo" || echo "   ❌ Redis: Inativo"
systemctl is-active nginx && echo "   ✅ Nginx: Ativo" || echo "   ❌ Nginx: Inativo"
systemctl is-active ncrisis && echo "   ✅ N.Crisis: Ativo" || echo "   ❌ N.Crisis: Inativo"

echo ""
echo "🧪 Testando aplicação..."
if curl -f -s --max-time 15 http://localhost:5000/health > /dev/null; then
    echo "   ✅ Aplicação respondendo"
    echo "   🌐 Acesse: https://monster.e-ness.com.br"
    echo "   📊 Health: https://monster.e-ness.com.br/health"
else
    echo "   ❌ Aplicação não está respondendo"
    echo "   📋 Logs do N.Crisis:"
    journalctl -u ncrisis --no-pager -n 15
fi

echo ""
echo "=========================================="
echo "✅ Correção do Nginx e N.Crisis Concluída"
echo "=========================================="
echo ""
echo "🛠️ Comandos úteis:"
echo "   systemctl status ncrisis"
echo "   journalctl -u ncrisis -f"
echo "   nginx -t"
echo "   systemctl restart ncrisis"
echo ""
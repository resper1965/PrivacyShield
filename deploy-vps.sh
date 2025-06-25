#!/bin/bash

# N.Crisis VPS Deployment Script
# Deploy para servidor próprio (Ubuntu 22.04 LTS)

set -e

echo "🚀 N.Crisis VPS Deployment"
echo "=========================="

# Configurações
DOMAIN=${1:-"seu-dominio.com"}
APP_DIR="/opt/ncrisis"
DB_NAME="ncrisis_prod"
DB_USER="ncrisis"
DB_PASS=$(openssl rand -base64 32)
REDIS_PASS=$(openssl rand -base64 32)

echo "📋 Configurações:"
echo "   Domínio: $DOMAIN"
echo "   Diretório: $APP_DIR"
echo "   Banco: $DB_NAME"

# 1. Atualizar sistema
echo "🔄 Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar dependências
echo "📦 Instalando dependências..."
sudo apt install -y curl wget git nginx postgresql postgresql-contrib redis-server \
    software-properties-common certbot python3-certbot-nginx ufw fail2ban

# 3. Instalar Node.js 20
echo "⚡ Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Configurar PostgreSQL
echo "🗄️  Configurando PostgreSQL..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# 5. Configurar Redis
echo "📊 Configurando Redis..."
sudo sed -i "s/# requirepass foobared/requirepass $REDIS_PASS/" /etc/redis/redis.conf
sudo systemctl restart redis-server

# 6. Criar diretório da aplicação
echo "📁 Criando estrutura de diretórios..."
sudo mkdir -p $APP_DIR
sudo chown -R $USER:$USER $APP_DIR

# 7. Copiar arquivos da aplicação
echo "📄 Copiando arquivos..."
cp -r . $APP_DIR/
cd $APP_DIR

# 8. Instalar dependências Node.js
echo "📦 Instalando dependências Node.js..."
npm ci --only=production

# 9. Build do frontend
echo "🏗️  Construindo frontend..."
cd frontend && npm ci && npm run build && cd ..

# 10. Criar arquivo .env
echo "⚙️  Criando configuração..."
cat > .env << EOF
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
REDIS_URL=redis://default:$REDIS_PASS@localhost:6379
OPENAI_API_KEY=$OPENAI_API_KEY
SENDGRID_API_KEY=$SENDGRID_API_KEY
CORS_ORIGINS=https://$DOMAIN,http://localhost:3000
CLAMAV_ENABLED=false
UPLOAD_MAX_SIZE=104857600
FAISS_INDEX_PATH=./data/faiss_index
SESSION_SECRET=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
EOF

# 11. Configurar Nginx
echo "🌐 Configurando Nginx..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=upload:10m rate=1r/s;

    location / {
        proxy_pass http://localhost:3000;
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

    location /api/v1/archives/upload {
        limit_req zone=upload burst=5 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        client_max_body_size 100M;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Ativar site
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 12. Configurar systemd service
echo "🔧 Configurando serviço systemd..."
sudo tee /etc/systemd/system/ncrisis.service > /dev/null << EOF
[Unit]
Description=N.Crisis PII Detection Platform
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node build/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$APP_DIR/.env

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR

# Limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF

# 13. Build da aplicação
echo "🏗️  Compilando aplicação..."
npm run build

# 14. Configurar firewall
echo "🔥 Configurando firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# 15. Configurar SSL com Let's Encrypt
echo "🔒 Configurando SSL..."
sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# 16. Iniciar serviços
echo "🚀 Iniciando serviços..."
sudo systemctl daemon-reload
sudo systemctl enable ncrisis
sudo systemctl start ncrisis

# 17. Verificar status
echo "✅ Verificando status..."
sleep 5
sudo systemctl status ncrisis --no-pager

echo ""
echo "🎉 Deploy concluído com sucesso!"
echo "================================"
echo "🌐 URL: https://$DOMAIN"
echo "📊 Status: sudo systemctl status ncrisis"
echo "📝 Logs: sudo journalctl -u ncrisis -f"
echo "🔄 Restart: sudo systemctl restart ncrisis"
echo ""
echo "📋 Credenciais do banco:"
echo "   Host: localhost"
echo "   Banco: $DB_NAME"
echo "   Usuário: $DB_USER"
echo "   Senha: $DB_PASS"
echo ""
echo "🔧 Próximos passos:"
echo "   1. Configure as variáveis OPENAI_API_KEY e SENDGRID_API_KEY no arquivo .env"
echo "   2. Teste o upload de arquivos"
echo "   3. Configure backup automático do banco"
echo "   4. Monitore os logs regularmente"
#!/bin/bash

# Script de Correção Direta para VPS N.Crisis
# Execute este comando na VPS: curl -s https://raw.githubusercontent.com/resper1965/PrivacyShield/main/vps-fix-direto.sh | bash

echo "🔧 Corrigindo N.Crisis na VPS monster.e-ness.com.br"
echo "=================================================="

# Verifica se é root
if [[ $EUID -ne 0 ]]; then
   echo "❌ Execute como root: sudo bash"
   exit 1
fi

# Para serviços problemáticos
systemctl stop ncrisis 2>/dev/null || echo "Serviço já parado"
pkill -f "node.*ncrisis" 2>/dev/null || echo "Nenhum processo Node.js encontrado"

# Cria serviço systemd correto
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
ExecStartPre=/bin/sleep 5
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
TimeoutStartSec=120
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Corrige permissões e propriedades
cd /opt/ncrisis
chown -R ncrisis:ncrisis /opt/ncrisis
chmod +x manage.sh 2>/dev/null || echo "manage.sh não encontrado"

# Cria .env se não existir
if [[ ! -f .env ]]; then
    cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis:Vk7yTXpTuI4DqtcwfAiB4O2ry@localhost:5432/ncrisis
REDIS_URL=redis://default:mSSM36aywmQ1qPdKnT8GiJf5x@localhost:6379
CORS_ORIGINS=https://monster.e-ness.com.br,http://monster.e-ness.com.br
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/opt/ncrisis/uploads
EOF
    chown ncrisis:ncrisis .env
    chmod 600 .env
fi

# Instala dependências se necessário
if [[ ! -d node_modules ]]; then
    echo "Instalando dependências..."
    sudo -u ncrisis npm install --production
fi

# Cria diretórios necessários
mkdir -p uploads logs tmp
chown -R ncrisis:ncrisis uploads logs tmp

# Inicializa banco de dados
sudo -u ncrisis npm run db:push 2>/dev/null || echo "Banco já inicializado"

# Corrige configuração do Nginx
cat > /etc/nginx/sites-available/monster.e-ness.com.br << 'EOF'
server {
    listen 80;
    server_name monster.e-ness.com.br;
    
    client_max_body_size 100M;
    
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
}
EOF

# Ativa site
ln -sf /etc/nginx/sites-available/monster.e-ness.com.br /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testa e recarrega Nginx
nginx -t && systemctl reload nginx

# Reinicia serviços
systemctl daemon-reload
systemctl enable ncrisis
systemctl restart postgresql
systemctl restart redis-server
systemctl restart nginx
systemctl start ncrisis

# Aguarda inicialização
sleep 15

# Verifica status
echo ""
echo "📊 Status dos Serviços:"
systemctl is-active postgresql && echo "✅ PostgreSQL: Ativo" || echo "❌ PostgreSQL: Inativo"
systemctl is-active redis-server && echo "✅ Redis: Ativo" || echo "❌ Redis: Inativo"
systemctl is-active nginx && echo "✅ Nginx: Ativo" || echo "❌ Nginx: Inativo"
systemctl is-active ncrisis && echo "✅ N.Crisis: Ativo" || echo "❌ N.Crisis: Inativo"

echo ""
echo "🧪 Testando aplicação..."
if curl -f -s --max-time 10 http://localhost:5000/health > /dev/null; then
    echo "✅ Aplicação respondendo em http://localhost:5000"
    echo "🌐 Acesse: https://monster.e-ness.com.br"
else
    echo "❌ Aplicação não está respondendo"
    echo "📋 Logs do serviço:"
    journalctl -u ncrisis --no-pager -n 10
fi

echo ""
echo "🛠️ Comandos úteis:"
echo "   systemctl status ncrisis"
echo "   journalctl -u ncrisis -f"
echo "   systemctl restart ncrisis"
echo ""
echo "✅ Correção concluída!"
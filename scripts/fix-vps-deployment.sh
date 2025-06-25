#!/bin/bash

# Fix VPS Deployment Issues
# Run this script on the VPS to resolve common deployment problems

set -e

echo "🔧 Fixing N.Crisis VPS Deployment Issues"
echo "========================================"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root"
   exit 1
fi

LOG_FILE="/var/log/ncrisis-fix.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo "[$(date '+%H:%M:%S')] 🚀 Starting deployment fixes..."

# Fix 1: Nginx Configuration Issues
echo "[$(date '+%H:%M:%S')] 🌐 Fixing Nginx configuration..."

# Create proper nginx.conf with http block
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Rate limiting
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
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# Create default site configuration
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled

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
ln -sf /etc/nginx/sites-available/monster.e-ness.com.br /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "[$(date '+%H:%M:%S')] Testing Nginx configuration..."
if nginx -t; then
    echo "✅ Nginx configuration is valid"
    systemctl reload nginx
else
    echo "❌ Nginx configuration has errors"
    exit 1
fi

# Fix 2: N.Crisis Service Configuration  
echo "[$(date '+%H:%M:%S')] 🔧 Fixing N.Crisis service..."

# Ensure correct ownership
chown -R ncrisis:ncrisis /opt/ncrisis
chmod +x /opt/ncrisis/manage.sh

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
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
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

# Fix 3: Environment Configuration
echo "[$(date '+%H:%M:%S')] ⚙️ Fixing environment configuration..."

cd /opt/ncrisis

# Ensure .env file exists with correct settings
if [[ ! -f .env ]]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# N.Crisis Environment Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
DATABASE_URL=postgresql://ncrisis:Vk7yTXpTuI4DqtcwfAiB4O2ry@localhost:5432/ncrisis

# Redis Configuration  
REDIS_URL=redis://default:mSSM36aywmQ1qPdKnT8GiJf5x@localhost:6379

# Security
CORS_ORIGINS=https://monster.e-ness.com.br,http://monster.e-ness.com.br

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/opt/ncrisis/uploads

# AI Configuration (Configure these for full functionality)
# OPENAI_API_KEY=sk-your_openai_key_here  
# SENDGRID_API_KEY=SG.your_sendgrid_key_here

# Application
APP_URL=https://monster.e-ness.com.br
APP_NAME=N.Crisis
EOF
    chown ncrisis:ncrisis .env
    chmod 600 .env
fi

# Fix 4: Dependencies and Database
echo "[$(date '+%H:%M:%S')] 📦 Checking dependencies..."

# Install dependencies as ncrisis user
sudo -u ncrisis npm install --production

# Initialize database
echo "[$(date '+%H:%M:%S')] 🗄️ Initializing database..."
sudo -u ncrisis npm run db:push || echo "Database already initialized"

# Fix 5: Create required directories
echo "[$(date '+%H:%M:%S')] 📁 Creating required directories..."
mkdir -p /opt/ncrisis/uploads /opt/ncrisis/logs /opt/ncrisis/tmp
chown -R ncrisis:ncrisis /opt/ncrisis/uploads /opt/ncrisis/logs /opt/ncrisis/tmp
chmod 755 /opt/ncrisis/uploads /opt/ncrisis/logs /opt/ncrisis/tmp

# Fix 6: Reload and restart services
echo "[$(date '+%H:%M:%S')] 🔄 Restarting services..."

systemctl daemon-reload
systemctl enable ncrisis
systemctl restart postgresql
systemctl restart redis-server  
systemctl restart nginx
systemctl restart ncrisis

# Wait for services to start
sleep 10

# Fix 7: Final verification
echo "[$(date '+%H:%M:%S')] 🔍 Final verification..."

echo "Service Status:"
systemctl is-active postgresql && echo "   ✅ PostgreSQL: Active" || echo "   ❌ PostgreSQL: Inactive"
systemctl is-active redis-server && echo "   ✅ Redis: Active" || echo "   ❌ Redis: Inactive"  
systemctl is-active nginx && echo "   ✅ Nginx: Active" || echo "   ❌ Nginx: Inactive"
systemctl is-active ncrisis && echo "   ✅ N.Crisis: Active" || echo "   ❌ N.Crisis: Inactive"

echo ""
echo "Testing application..."
sleep 5

if curl -f -s http://localhost:5000/health > /dev/null; then
    echo "   ✅ Application responding on port 5000"
else
    echo "   ❌ Application not responding on port 5000"
    echo "   📋 Checking logs..."
    journalctl -u ncrisis --no-pager -n 10
fi

echo ""
echo "========================================"
echo "✅ N.Crisis VPS Deployment Fix Complete"
echo "========================================"
echo ""
echo "🌐 Application URL: https://monster.e-ness.com.br"
echo "📊 Health Check: https://monster.e-ness.com.br/health"
echo ""
echo "🛠️ Management Commands:"
echo "   cd /opt/ncrisis"
echo "   ./manage.sh status"
echo "   ./manage.sh logs"
echo "   ./manage.sh restart"
echo ""
echo "⚠️ IMPORTANT: Configure API keys for full functionality:"
echo "   nano /opt/ncrisis/.env"
echo "   systemctl restart ncrisis"
echo ""
echo "📋 Full log: $LOG_FILE"
echo ""
EOF

chmod +x scripts/fix-vps-deployment.sh
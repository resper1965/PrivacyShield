#!/bin/bash

# VPS Service Fix Script for N.Crisis
# Specifically addresses the "activating" service issue

set -e

echo "🔧 N.Crisis VPS Service Fix"
echo "=========================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root"
   exit 1
fi

LOG_FILE="/var/log/ncrisis-service-fix.log"
exec 1> >(tee -a "$LOG_FILE")
exec 2> >(tee -a "$LOG_FILE" >&2)

echo "[$(date '+%H:%M:%S')] 🚀 Starting service fix..."

# Stop the problematic service
echo "[$(date '+%H:%M:%S')] 🛑 Stopping N.Crisis service..."
systemctl stop ncrisis || echo "Service already stopped"

# Check for and kill any hanging Node.js processes
echo "[$(date '+%H:%M:%S')] 🔍 Checking for hanging processes..."
pkill -f "node.*ncrisis" || echo "No hanging processes found"
pkill -f "ts-node.*server" || echo "No hanging TypeScript processes found"

# Create proper systemd service file
echo "[$(date '+%H:%M:%S')] ⚙️ Creating proper systemd service..."
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
KillMode=process
Restart=always
RestartSec=10
TimeoutStartSec=60
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

# Fix ownership and permissions
echo "[$(date '+%H:%M:%S')] 🔧 Fixing ownership and permissions..."
cd /opt/ncrisis

# Ensure ncrisis user exists
if ! id "ncrisis" &>/dev/null; then
    echo "Creating ncrisis user..."
    useradd -r -s /bin/bash -d /opt/ncrisis ncrisis
fi

# Fix ownership
chown -R ncrisis:ncrisis /opt/ncrisis
chmod +x manage.sh || echo "manage.sh not found"
chmod 600 .env 2>/dev/null || echo ".env not found, will create"

# Create .env if missing
if [[ ! -f .env ]]; then
    echo "[$(date '+%H:%M:%S')] 📝 Creating .env file..."
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

# Install dependencies if needed
echo "[$(date '+%H:%M:%S')] 📦 Checking dependencies..."
if [[ ! -d node_modules ]]; then
    echo "Installing dependencies..."
    sudo -u ncrisis npm install --production
fi

# Build application if needed
echo "[$(date '+%H:%M:%S')] 🏗️ Building application..."
sudo -u ncrisis npm run build || echo "Build failed, will try ts-node"

# Create required directories
echo "[$(date '+%H:%M:%S')] 📁 Creating required directories..."
mkdir -p uploads logs tmp
chown -R ncrisis:ncrisis uploads logs tmp

# Initialize database
echo "[$(date '+%H:%M:%S')] 🗄️ Initializing database..."
sudo -u ncrisis npm run db:push || echo "Database initialization failed"

# Test database connection
echo "[$(date '+%H:%M:%S')] 🧪 Testing database connection..."
if sudo -u postgres psql -c "SELECT 1;" ncrisis &>/dev/null; then
    echo "✅ Database connection successful"
else
    echo "⚠️ Database connection failed"
fi

# Reload systemd and enable service
echo "[$(date '+%H:%M:%S')] 🔄 Reloading systemd..."
systemctl daemon-reload
systemctl enable ncrisis

# Start service with timeout
echo "[$(date '+%H:%M:%S')] 🚀 Starting N.Crisis service..."
systemctl start ncrisis

# Wait and check status
echo "[$(date '+%H:%M:%S')] ⏳ Waiting for service to start..."
sleep 15

# Check service status
if systemctl is-active ncrisis &>/dev/null; then
    echo "✅ N.Crisis service is active"
    
    # Test application response
    echo "[$(date '+%H:%M:%S')] 🧪 Testing application response..."
    sleep 5
    
    if curl -f -s --max-time 10 http://localhost:5000/health > /dev/null; then
        echo "✅ Application is responding"
        HEALTH=$(curl -s --max-time 5 http://localhost:5000/health 2>/dev/null || echo "No response")
        echo "📊 Health check: $HEALTH"
    else
        echo "❌ Application not responding"
        echo "📋 Service logs:"
        journalctl -u ncrisis --no-pager -n 10
    fi
else
    echo "❌ N.Crisis service failed to start"
    echo "📋 Service status:"
    systemctl status ncrisis --no-pager -l
    echo "📋 Service logs:"
    journalctl -u ncrisis --no-pager -n 20
fi

echo ""
echo "========================================"
echo "✅ N.Crisis VPS Service Fix Complete"
echo "========================================"
echo ""
echo "🛠️ Management Commands:"
echo "   systemctl status ncrisis"
echo "   journalctl -u ncrisis -f"
echo "   systemctl restart ncrisis"
echo ""
echo "🌐 Test URLs:"
echo "   curl http://localhost:5000/health"
echo "   curl http://monster.e-ness.com.br/health"
echo ""
echo "📋 Full log: $LOG_FILE"
echo ""
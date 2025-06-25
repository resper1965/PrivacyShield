# N.Crisis VPS Troubleshooting Guide

## Quick Diagnosis

Run the status check script first:
```bash
cd /opt/ncrisis
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/vps-quick-status.sh
chmod +x vps-quick-status.sh
./vps-quick-status.sh
```

## Common Issues and Solutions

### 1. Application Service Not Starting

**Symptoms:**
- `systemctl status ncrisis` shows "activating" or "failed"
- Port 5000 not listening
- Health check failing

**Solutions:**

#### Fix A: Service Configuration
```bash
# Fix systemd service
cd /opt/ncrisis
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/fix-vps-deployment.sh
chmod +x fix-vps-deployment.sh
./fix-vps-deployment.sh
```

#### Fix B: Manual Restart
```bash
# Stop and restart properly
systemctl stop ncrisis
systemctl daemon-reload
systemctl start ncrisis
systemctl status ncrisis
```

#### Fix C: Check Dependencies
```bash
cd /opt/ncrisis
npm install --production
npm run db:push
systemctl restart ncrisis
```

### 2. Nginx Configuration Errors

**Symptoms:**
- `nginx -t` fails
- Web interface not accessible
- 502 Bad Gateway errors

**Solutions:**

#### Fix Nginx Config
```bash
# Backup current config
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Create proper config
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;

events {
    worker_connections 768;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # Basic settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    
    # Gzip
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    
    # Include sites
    include /etc/nginx/sites-enabled/*;
}
EOF

# Test and reload
nginx -t && systemctl reload nginx
```

### 3. Database Connection Issues

**Symptoms:**
- "Database connection failed" in logs
- Application crashes on startup
- Health check shows database disconnected

**Solutions:**

#### Check PostgreSQL
```bash
# Verify PostgreSQL is running
systemctl status postgresql

# Test connection
sudo -u postgres psql -c "SELECT version();"

# Check if database exists
sudo -u postgres psql -l | grep ncrisis

# Recreate database if needed
sudo -u postgres createdb ncrisis
sudo -u postgres psql -c "CREATE USER ncrisis WITH PASSWORD 'Vk7yTXpTuI4DqtcwfAiB4O2ry';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ncrisis TO ncrisis;"
```

#### Update Environment
```bash
cd /opt/ncrisis
nano .env

# Ensure DATABASE_URL is correct:
DATABASE_URL=postgresql://ncrisis:Vk7yTXpTuI4DqtcwfAiB4O2ry@localhost:5432/ncrisis

# Restart application
systemctl restart ncrisis
```

### 4. Permission Issues

**Symptoms:**
- "Permission denied" errors in logs
- File upload failures
- Cannot write to directories

**Solutions:**

```bash
# Fix ownership
chown -R ncrisis:ncrisis /opt/ncrisis

# Fix permissions
chmod +x /opt/ncrisis/manage.sh
chmod 600 /opt/ncrisis/.env
chmod 755 /opt/ncrisis/uploads /opt/ncrisis/logs

# Create missing directories
mkdir -p /opt/ncrisis/{uploads,logs,tmp}
chown -R ncrisis:ncrisis /opt/ncrisis/{uploads,logs,tmp}
```

### 5. Port Conflicts

**Symptoms:**
- "Port already in use" errors
- Services failing to start
- Connection refused errors

**Solutions:**

```bash
# Check what's using ports
netstat -tlnp | grep -E ":(5000|5432|6379|80) "

# Kill conflicting processes
pkill -f "node.*5000"
pkill -f "postgres.*5432"

# Restart services in order
systemctl restart postgresql
systemctl restart redis-server
systemctl restart nginx
systemctl restart ncrisis
```

## Monitoring and Logs

### View Application Logs
```bash
# Real-time logs
journalctl -u ncrisis -f

# Last 50 lines
journalctl -u ncrisis -n 50

# Logs from last hour
journalctl -u ncrisis --since "1 hour ago"
```

### Check All Services
```bash
# Service status
systemctl status postgresql redis-server nginx ncrisis

# Port usage
ss -tlnp | grep -E ":(5000|5432|6379|80) "

# Resource usage
htop
df -h
free -h
```

### Application Health
```bash
# Health check
curl http://localhost:5000/health

# API test
curl http://localhost:5000/api/queue/status

# Web interface test
curl -I http://localhost:80/
```

## Complete Reset (Last Resort)

If all else fails, run a complete reinstallation:

```bash
# Stop all services
systemctl stop ncrisis nginx

# Remove application
rm -rf /opt/ncrisis

# Re-run installation
cd /root
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-root.sh
chmod +x install-root.sh
./install-root.sh monster.e-ness.com.br
```

## Performance Optimization

### For Low Memory VPS
```bash
# Reduce Node.js memory usage
echo 'NODE_OPTIONS="--max-old-space-size=512"' >> /opt/ncrisis/.env

# Optimize PostgreSQL
echo "shared_buffers = 128MB" >> /etc/postgresql/*/main/postgresql.conf
systemctl restart postgresql
```

### For High Traffic
```bash
# Increase Nginx worker processes
sed -i 's/worker_processes auto;/worker_processes 4;/' /etc/nginx/nginx.conf

# Increase rate limits
sed -i 's/rate=10r\/s/rate=50r\/s/' /etc/nginx/sites-enabled/monster.e-ness.com.br

# Restart Nginx
systemctl reload nginx
```

## Getting Help

1. **Check Status**: Run `./vps-quick-status.sh`
2. **View Logs**: `journalctl -u ncrisis -f`
3. **Test Components**: Use the troubleshooting commands above
4. **Complete Fix**: Run `./fix-vps-deployment.sh`

## Contact Information

- **GitHub Issues**: https://github.com/resper1965/PrivacyShield/issues
- **Documentation**: `/opt/ncrisis/docs/`
- **Log Files**: `/var/log/ncrisis-install.log`
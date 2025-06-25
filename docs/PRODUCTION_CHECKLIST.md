# N.Crisis - Production Deployment Checklist

**Version**: 2.1  
**Target**: monster.e-ness.com.br  
**Date**: June 25, 2025

## Pre-Deployment Requirements

### 1. Server Infrastructure ✅
- [ ] Ubuntu 22.04 LTS server provisioned
- [ ] Minimum 8GB RAM, 4 CPU cores, 100GB SSD
- [ ] Domain DNS configured (monster.e-ness.com.br)
- [ ] SSL certificate ready (Let's Encrypt)
- [ ] Firewall ports configured (22, 80, 443, 5000)

### 2. External Services Setup
- [ ] **OpenAI API Key** - Required for AI features
  - Visit: https://platform.openai.com/api-keys
  - Generate API key with GPT-3.5-turbo access
  - Test with simple curl request
- [ ] **GitHub Access Token** - Required for deployment
  - Create personal access token with repo access
  - Test repository access
- [ ] **SendGrid API Key** (Optional)
  - For email notifications
  - Configure sender domain verification

### 3. Environment Configuration
- [ ] All required environment variables configured
- [ ] Database credentials secured
- [ ] API keys validated and working
- [ ] CORS origins configured for production domain

## Deployment Process

### Step 1: Server Preparation
```bash
# Connect to server
ssh root@monster.e-ness.com.br

# Set deployment variables
export GITHUB_PERSONAL_ACCESS_TOKEN="your_token_here"
export DOMAIN="monster.e-ness.com.br"
export OPENAI_API_KEY="sk-proj-xxxxxxxxxx"
```

### Step 2: Download Installation Script
```bash
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -H "Accept: application/vnd.github.v3.raw" \
  -o install-and-start.sh \
  https://api.github.com/repos/resper1965/PrivacyShield/contents/install-and-start.sh

chmod +x install-and-start.sh
```

### Step 3: Execute Installation
```bash
./install-and-start.sh
```

### Step 4: Post-Installation Configuration
```bash
# Edit environment file with real API keys
nano /opt/ncrisis/.env

# Update the following:
OPENAI_API_KEY=sk-proj-your-real-key-here
SENDGRID_API_KEY=SG.your-real-key-here
N8N_WEBHOOK_URL=https://your-n8n.domain.com/webhook

# Restart service
systemctl restart ncrisis
```

## Post-Deployment Verification

### 1. Service Health Checks ✅
```bash
# System services
systemctl status ncrisis
systemctl status postgresql
systemctl status redis-server
systemctl status clamav-daemon

# Application health
curl http://localhost:5000/health
curl http://localhost:5000/api/v1/embeddings/health
curl http://localhost:5000/api/v1/chat/health
curl http://localhost:5000/api/v1/search/stats
```

### 2. Functional Testing
```bash
# Test file upload
curl -X POST http://localhost:5000/api/v1/archives/upload \
  -F "file=@test.zip"

# Test AI chat
curl -X POST http://localhost:5000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "O que você sabe sobre PII?"}'

# Test semantic search
curl -X POST http://localhost:5000/api/v1/search/semantic \
  -H "Content-Type: application/json" \
  -d '{"query": "CPF documento", "k": 3}'
```

### 3. Performance Verification
- [ ] API response times < 500ms (core APIs)
- [ ] AI APIs response times < 2s
- [ ] Memory usage stable < 4GB
- [ ] CPU usage normal during processing
- [ ] FAISS index loading correctly

### 4. Security Verification
- [ ] ClamAV scanning active
- [ ] Firewall rules applied
- [ ] File permissions correct (600 for .env)
- [ ] No sensitive data in logs
- [ ] SSL certificate valid

## Monitoring Setup

### 1. Log Monitoring
```bash
# Application logs
journalctl -u ncrisis -f

# Database logs
tail -f /var/log/postgresql/postgresql-15-main.log

# System logs
tail -f /var/log/syslog
```

### 2. Automated Backup
```bash
# Create backup script
cat > /opt/ncrisis/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/ncrisis/backups"
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U ncrisis_user ncrisis > $BACKUP_DIR/db_$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz /opt/ncrisis/uploads /opt/ncrisis/.env

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /opt/ncrisis/backup.sh

# Schedule daily backups
echo "0 2 * * * /opt/ncrisis/backup.sh" | crontab -
```

### 3. Health Check Monitoring
```bash
# Create health check script
cat > /opt/ncrisis/health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:5000/health"
LOG_FILE="/var/log/ncrisis-health.log"

if ! curl -f -s $HEALTH_URL > /dev/null; then
    echo "$(date): Health check failed" >> $LOG_FILE
    systemctl restart ncrisis
else
    echo "$(date): Health check passed" >> $LOG_FILE
fi
EOF

chmod +x /opt/ncrisis/health-check.sh

# Schedule every 5 minutes
echo "*/5 * * * * /opt/ncrisis/health-check.sh" | crontab -
```

## Performance Tuning

### 1. PostgreSQL Optimization
```sql
-- /etc/postgresql/15/main/postgresql.conf
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 256MB
max_connections = 100
checkpoint_completion_target = 0.9
```

### 2. Node.js Optimization
```bash
# In /opt/ncrisis/.env
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
```

### 3. System Limits
```bash
# /etc/security/limits.conf
ncrisis soft nofile 65536
ncrisis hard nofile 65536
```

## Troubleshooting Guide

### Common Issues

**1. OpenAI API Errors**
```bash
# Check API key validity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# Check rate limits in logs
journalctl -u ncrisis | grep "rate limit"
```

**2. FAISS Memory Issues**
```bash
# Check memory usage
free -h

# Restart FAISS service
curl -X POST http://localhost:5000/api/v1/search/rebuild
```

**3. Database Connection Issues**
```bash
# Test database connection
psql -U ncrisis_user -d ncrisis -h localhost

# Check connection pool
curl http://localhost:5000/health | jq '.database'
```

## Success Criteria

- [ ] All APIs responding with correct status codes
- [ ] File upload and processing working
- [ ] AI chat providing relevant responses
- [ ] Semantic search returning accurate results
- [ ] N8N webhooks processing correctly
- [ ] Database operations stable
- [ ] Logs clean without errors
- [ ] Performance within acceptable ranges
- [ ] Security measures active

## Post-Go-Live Tasks

### 1. User Training
- [ ] Document API usage examples
- [ ] Create user guides for web interface
- [ ] Provide integration examples

### 2. Monitoring Setup
- [ ] Configure alerts for service failures
- [ ] Set up performance dashboards
- [ ] Enable log aggregation

### 3. Maintenance Schedule
- [ ] Weekly health checks
- [ ] Monthly security updates
- [ ] Quarterly performance reviews
- [ ] Annual architecture assessment

---

**Deployment Checklist v2.1** - Updated June 25, 2025  
**Completion Target**: 100% before go-live
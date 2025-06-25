# N.Crisis - Quick Start Production Guide

**Target**: Production deployment in under 30 minutes  
**Server**: monster.e-ness.com.br

## Prerequisites (5 minutes)

1. **OpenAI API Key** - Get from https://platform.openai.com/api-keys
2. **GitHub Token** - Create at https://github.com/settings/tokens
3. **Server Access** - SSH access to Ubuntu 22.04+ server

## One-Command Deployment (15 minutes)

```bash
# Step 1: Connect to server
ssh root@monster.e-ness.com.br

# Step 2: Set environment variables
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxxxxxxxxxxxxxxx"
export OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxx"
export DOMAIN="monster.e-ness.com.br"

# Step 3: Download and run installation
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -H "Accept: application/vnd.github.v3.raw" \
  -o install-and-start.sh \
  https://api.github.com/repos/resper1965/PrivacyShield/contents/install-and-start.sh

chmod +x install-and-start.sh && ./install-and-start.sh
```

## Post-Installation Configuration (5 minutes)

```bash
# Update API keys in environment file
nano /opt/ncrisis/.env

# Add your real OpenAI API key:
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Restart service
systemctl restart ncrisis
```

## Verification (5 minutes)

```bash
# Check all services are running
systemctl status ncrisis postgresql redis-server clamav-daemon

# Test API endpoints
curl http://localhost:5000/health
curl http://localhost:5000/api/v1/chat/health
curl http://localhost:5000/api/v1/search/stats

# Test AI functionality
curl -X POST http://localhost:5000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Hello, can you help me understand PII detection?"}'
```

## What Gets Installed

- ✅ PostgreSQL 15 database with ncrisis schema
- ✅ Node.js 20 with TypeScript compilation
- ✅ Redis server for queue management
- ✅ ClamAV antivirus for file scanning
- ✅ N.Crisis application with AI features
- ✅ Systemd service for auto-start
- ✅ UFW firewall configuration

## Key Features Available

- **PII Detection**: Upload ZIP files for automated scanning
- **AI Chat**: Ask questions about processed documents
- **Semantic Search**: Find similar content using FAISS
- **Real-time Processing**: WebSocket progress updates
- **LGPD Reports**: Compliance reporting and analytics

## Access URLs

- **Web Interface**: http://monster.e-ness.com.br:5000
- **API Base**: http://monster.e-ness.com.br:5000/api/v1
- **Health Check**: http://monster.e-ness.com.br:5000/health

## Common API Examples

```bash
# Upload a ZIP file for processing
curl -X POST http://monster.e-ness.com.br:5000/api/v1/archives/upload \
  -F "file=@documents.zip"

# Ask AI about findings
curl -X POST http://monster.e-ness.com.br:5000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "What PII was found in the uploaded documents?", "k": 5}'

# Get detection reports
curl "http://monster.e-ness.com.br:5000/api/v1/reports/detections?limit=10"
```

## Next Steps

1. **SSL Setup**: Configure Let's Encrypt for HTTPS
2. **Domain Configuration**: Point DNS to server IP
3. **Monitoring**: Set up health checks and alerts
4. **Backup**: Configure automated database backups

## Support

- **Documentation**: See `DEPLOYMENT_GUIDE_COMPLETE.md`
- **API Reference**: See `API_DOCUMENTATION.md`
- **Troubleshooting**: Check logs with `journalctl -u ncrisis -f`

---

**Quick Start Guide v2.1** - AI-Powered PII Detection Platform
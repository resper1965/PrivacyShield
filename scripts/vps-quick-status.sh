#!/bin/bash

# Quick VPS Status Check for N.Crisis
# Run this to quickly check the status of all services

echo "🔍 N.Crisis VPS Status Check"
echo "============================"
echo ""

# Service Status
echo "📊 Service Status:"
systemctl is-active postgresql &>/dev/null && echo "   ✅ PostgreSQL: $(systemctl is-active postgresql)" || echo "   ❌ PostgreSQL: $(systemctl is-active postgresql)"
systemctl is-active redis-server &>/dev/null && echo "   ✅ Redis: $(systemctl is-active redis-server)" || echo "   ❌ Redis: $(systemctl is-active redis-server)"
systemctl is-active nginx &>/dev/null && echo "   ✅ Nginx: $(systemctl is-active nginx)" || echo "   ❌ Nginx: $(systemctl is-active nginx)"
systemctl is-active ncrisis &>/dev/null && echo "   ✅ N.Crisis: $(systemctl is-active ncrisis)" || echo "   ❌ N.Crisis: $(systemctl is-active ncrisis)"

echo ""

# Port Check
echo "🌐 Port Status:"
if netstat -tlnp 2>/dev/null | grep -q ":5432 "; then
    echo "   ✅ PostgreSQL (5432): Listening"
else
    echo "   ❌ PostgreSQL (5432): Not listening"
fi

if netstat -tlnp 2>/dev/null | grep -q ":6379 "; then
    echo "   ✅ Redis (6379): Listening"  
else
    echo "   ❌ Redis (6379): Not listening"
fi

if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "   ✅ Nginx (80): Listening"
else
    echo "   ❌ Nginx (80): Not listening"
fi

if netstat -tlnp 2>/dev/null | grep -q ":5000 "; then
    echo "   ✅ N.Crisis (5000): Listening"
else
    echo "   ❌ N.Crisis (5000): Not listening"
fi

echo ""

# Application Health
echo "🏥 Application Health:"
if curl -f -s --max-time 10 http://localhost:5000/health > /dev/null 2>&1; then
    echo "   ✅ Health check: Passing"
    HEALTH_RESPONSE=$(curl -s --max-time 5 http://localhost:5000/health 2>/dev/null || echo "No response")
    echo "   📊 Response: $HEALTH_RESPONSE"
else
    echo "   ❌ Health check: Failing"
fi

echo ""

# Disk Space
echo "💾 Disk Usage:"
df -h /opt/ncrisis 2>/dev/null | tail -1 | awk '{print "   📁 N.Crisis: " $3 " used of " $2 " (" $5 " full)"}'

# Memory Usage
echo ""
echo "🧠 Memory Usage:"
free -h | grep "Mem:" | awk '{print "   💭 RAM: " $3 " used of " $2}'

# Recent Logs
echo ""
echo "📋 Recent N.Crisis Logs (last 5 lines):"
if systemctl is-active ncrisis &>/dev/null; then
    journalctl -u ncrisis --no-pager -n 5 --output=cat 2>/dev/null | sed 's/^/   /'
else
    echo "   ⚠️ Service not running"
fi

echo ""
echo "🛠️ Management Commands:"
echo "   cd /opt/ncrisis"
echo "   ./manage.sh status    # Detailed status"
echo "   ./manage.sh logs      # View logs"
echo "   ./manage.sh restart   # Restart application"
echo "   systemctl status ncrisis  # Service status"
echo ""

# Quick recommendations
if ! systemctl is-active ncrisis &>/dev/null; then
    echo "🚨 Recommendations:"
    echo "   1. Check logs: journalctl -u ncrisis -f"
    echo "   2. Verify config: cd /opt/ncrisis && npm run db:push"
    echo "   3. Restart: systemctl restart ncrisis"
    echo ""
fi

echo "🌐 URLs:"
echo "   Application: https://monster.e-ness.com.br"
echo "   Health: https://monster.e-ness.com.br/health"
echo ""
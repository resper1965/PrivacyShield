#!/bin/bash

# Teste completo da aplicação N.Crisis na VPS
echo "=== TESTE COMPLETO N.CRISIS ==="

DOMAIN="monster.e-ness.com.br"

echo "1. Testando API Health..."
API_RESPONSE=$(curl -s http://${DOMAIN}/health)
if echo "$API_RESPONSE" | grep -q "healthy"; then
    echo "✅ API Health OK"
    echo "$API_RESPONSE" | head -3
else
    echo "❌ API Health falhou"
    echo "$API_RESPONSE"
fi
echo

echo "2. Testando Frontend..."
FRONTEND_RESPONSE=$(curl -s http://${DOMAIN}/ | head -5)
if echo "$FRONTEND_RESPONSE" | grep -q "<!DOCTYPE\|<html\|<title"; then
    echo "✅ Frontend servindo HTML"
    echo "$FRONTEND_RESPONSE"
else
    echo "⚠️ Frontend pode estar servindo JSON da API"
    echo "$FRONTEND_RESPONSE"
fi
echo

echo "3. Testando endpoints API..."
echo "Upload endpoint:"
curl -s -X POST http://${DOMAIN}/api/v1/archives/upload | head -3
echo

echo "Detections endpoint:"
curl -s http://${DOMAIN}/api/v1/reports/detections | head -3
echo

echo "4. Testando WebSocket..."
if curl -s http://${DOMAIN}/socket.io/ | grep -q "0{"; then
    echo "✅ WebSocket endpoint ativo"
else
    echo "❌ WebSocket endpoint não responde"
fi
echo

echo "5. Status dos containers (se executando na VPS)..."
if [ -d "/opt/ncrisis" ] && command -v docker >/dev/null 2>&1; then
    cd /opt/ncrisis
    echo "Containers ativos:"
    docker compose ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "Executando fora da VPS ou sem Docker"
fi
echo

echo "6. Testando funcionalidades específicas..."
echo "Chat API:"
curl -s -X POST http://${DOMAIN}/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query":"teste"}' | head -3
echo

echo "Search API:"  
curl -s -X POST http://${DOMAIN}/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query":"teste"}' | head -3
echo

echo "=== RESUMO ==="
echo "Dashboard: http://${DOMAIN}"
echo "API: http://${DOMAIN}/health"
echo "Upload: http://${DOMAIN}/api/v1/archives/upload"
echo "Detections: http://${DOMAIN}/api/v1/reports/detections"
echo "Chat: http://${DOMAIN}/api/v1/chat"
echo "Search: http://${DOMAIN}/api/v1/search"
echo "WebSocket: http://${DOMAIN}/socket.io/"
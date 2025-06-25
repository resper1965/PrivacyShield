#!/bin/bash

echo "Instalando http-proxy-middleware..."
npm install http-proxy-middleware

echo "Parando aplicação atual..."
docker compose down 2>/dev/null || true

echo "Iniciando aplicação na porta 5000..."
docker compose up -d

echo "Aguardando aplicação inicializar..."
sleep 60

echo "Testando aplicação..."
curl -sf http://localhost:5000/health && echo "App OK" || echo "App falhou"

echo "Iniciando proxy na porta 80..."
PROXY_PORT=80 node proxy-server.js &
PROXY_PID=$!

echo "Proxy PID: $PROXY_PID"
echo "Aguardando proxy estabilizar..."
sleep 10

echo "Testando acesso via proxy..."
curl -sf http://localhost/health && echo "Proxy OK" || echo "Proxy falhou"

echo "Testando acesso externo..."
curl -sf http://monster.e-ness.com.br/health && echo "Acesso externo OK" || echo "Acesso externo falhou"

echo "================================"
echo "N.Crisis rodando em:"
echo "  Local: http://localhost/health"
echo "  Externo: http://monster.e-ness.com.br"
echo "  App direto: http://localhost:5000/health"
echo "================================"
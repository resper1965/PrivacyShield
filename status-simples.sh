#!/bin/bash

# Status simplificado N.Crisis
echo "=== STATUS N.CRISIS ==="

echo "App (5000): $(curl -sf http://localhost:5000/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Nginx (80): $(curl -sf http://localhost/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"  
echo "Externo:    $(curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

if [ -d "/opt/ncrisis" ]; then
    cd /opt/ncrisis
    echo "Containers: $(docker compose ps --services --filter status=running | wc -l)/3 ativos"
fi

echo "Nginx:      $(systemctl is-active nginx 2>/dev/null || echo 'inativo')"
echo "Porta 5000: $(ss -tln | grep -q :5000 && echo 'aberta' || echo 'fechada')"
echo "Porta 80:   $(ss -tln | grep -q :80 && echo 'aberta' || echo 'fechada')"
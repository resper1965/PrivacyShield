#!/bin/bash

# Teste rápido do status N.Crisis
echo "=== TESTE RÁPIDO N.CRISIS ==="
echo "Data: $(date)"
echo

# Teste aplicação local
echo "1. Aplicação local (porta 5000):"
if curl -sf http://localhost:5000/health 2>/dev/null; then
    echo "✅ OK"
else
    echo "❌ FALHOU"
fi
echo

# Teste proxy Nginx
echo "2. Proxy Nginx:"
if curl -sf http://localhost/health 2>/dev/null; then
    echo "✅ OK"
else
    echo "❌ FALHOU"
fi
echo

# Teste acesso externo
echo "3. Acesso externo:"
if curl -sf http://monster.e-ness.com.br/health 2>/dev/null; then
    echo "✅ OK"
else
    echo "❌ FALHOU"
fi
echo

# Status dos serviços
echo "4. Status dos serviços:"
if command -v docker >/dev/null 2>&1 && [ -d "/opt/ncrisis" ]; then
    cd /opt/ncrisis
    echo "Containers:"
    docker compose ps 2>/dev/null | grep -v "^$" || echo "❌ Erro ao verificar containers"
fi

if command -v systemctl >/dev/null 2>&1; then
    echo "Nginx: $(systemctl is-active nginx 2>/dev/null || echo 'inativo')"
fi
echo

# Portas em uso
echo "5. Portas:"
ss -tlnp 2>/dev/null | grep ":5000\|:80\|:443" || echo "Nenhuma porta web encontrada"
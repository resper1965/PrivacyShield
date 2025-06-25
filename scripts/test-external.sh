#!/bin/bash

echo "Testando conectividade externa..."

# Testar se conseguimos acessar serviços externos
echo "1. Teste básico de internet:"
curl -sf https://httpbin.org/ip && echo " - Internet OK" || echo " - Internet falhou"

# Testar resolução DNS
echo "2. Resolução DNS:"
nslookup monster.e-ness.com.br 8.8.8.8 | grep -A 2 "Name:" || echo " - DNS não resolve"

# Testar aplicação local
echo "3. Aplicação local:"
curl -sf http://localhost:5000/health | jq -r '.status' 2>/dev/null && echo " - App local OK" || echo " - App local falhou"

# Testar se porta 5000 está acessível externamente
echo "4. Teste de porta externa:"
timeout 10 bash -c 'cat < /dev/null > /dev/tcp/monster.e-ness.com.br/5000' && echo " - Porta 5000 acessível" || echo " - Porta 5000 não acessível"

# Testar HTTP direto
echo "5. HTTP direto para o domínio:"
curl -v -m 10 http://monster.e-ness.com.br/ 2>&1 | head -10

echo "6. Informações de rede:"
ip addr show | grep inet | grep -v 127.0.0.1 | head -5
#!/bin/bash

# Script de teste para verificar o que está falhando

echo "=== Teste de Instalação N.Crisis ==="

# Verificar se as variáveis estão definidas
if [[ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]]; then
    echo "ERRO: GITHUB_PERSONAL_ACCESS_TOKEN não definido"
    echo "Execute: export GITHUB_PERSONAL_ACCESS_TOKEN=\"sua_chave\""
    exit 1
fi

if [[ -z "$OPENAI_API_KEY" ]]; then
    echo "AVISO: OPENAI_API_KEY não definido"
    echo "Execute: export OPENAI_API_KEY=\"sua_chave\""
fi

echo "✓ Token GitHub configurado: ${GITHUB_PERSONAL_ACCESS_TOKEN:0:10}..."

# Testar acesso à API do GitHub
echo "Testando acesso ao repositório..."
response=$(curl -s -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
    "https://api.github.com/repos/resper1965/PrivacyShield")

if echo "$response" | grep -q '"name"'; then
    echo "✓ Acesso ao repositório OK"
else
    echo "✗ Falha no acesso ao repositório"
    echo "Resposta: $response"
    exit 1
fi

# Testar download do script
echo "Testando download do script..."
script_content=$(curl -s -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
    "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh" | \
    grep '"content"' | cut -d'"' -f4 | base64 -d)

if [[ -n "$script_content" ]]; then
    echo "✓ Download do script OK"
    echo "Tamanho: $(echo "$script_content" | wc -l) linhas"
else
    echo "✗ Falha no download do script"
    exit 1
fi

# Executar o script
echo "Executando instalação..."
echo "$script_content" | bash
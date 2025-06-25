#!/bin/bash

# Comando direto para instalação N.Crisis VPS
# Execute: bash comando-direto.sh

# SUBSTITUA AQUI SUAS CHAVES REAIS:
GITHUB_TOKEN="cole_sua_chave_github_aqui"
OPENAI_KEY="cole_sua_chave_openai_aqui"

# Verificar se as chaves foram alteradas
if [[ "$GITHUB_TOKEN" == "cole_sua_chave_github_aqui" ]]; then
    echo "ERRO: Edite este arquivo e cole sua chave GitHub na linha 6"
    echo "GitHub Token: https://github.com/settings/tokens"
    exit 1
fi

if [[ "$OPENAI_KEY" == "cole_sua_chave_openai_aqui" ]]; then
    echo "ERRO: Edite este arquivo e cole sua chave OpenAI na linha 7"
    echo "OpenAI Key: https://platform.openai.com/api-keys"
    exit 1
fi

echo "Baixando e executando instalação N.Crisis..."

# Download e execução
curl -H "Authorization: token $GITHUB_TOKEN" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | \
  GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN" \
  OPENAI_API_KEY="$OPENAI_KEY" \
  bash
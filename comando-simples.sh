#!/bin/bash

# Comando mais simples - baixa o script primeiro

echo "Baixando script de instalação..."

# Definir chaves (edite aqui)
export GITHUB_PERSONAL_ACCESS_TOKEN="cole_sua_chave_github_aqui"
export OPENAI_API_KEY="cole_sua_chave_openai_aqui"

# Verificar se as chaves foram definidas
if [[ "$GITHUB_PERSONAL_ACCESS_TOKEN" == "cole_sua_chave_github_aqui" ]]; then
    echo "ERRO: Edite este arquivo e cole sua chave GitHub"
    exit 1
fi

# Baixar script
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d > install-downloaded.sh

# Verificar se baixou
if [[ ! -s install-downloaded.sh ]]; then
    echo "ERRO: Falha no download do script"
    exit 1
fi

echo "Script baixado com sucesso!"
echo "Executando instalação..."

# Executar
chmod +x install-downloaded.sh
bash install-downloaded.sh

# Limpar
rm -f install-downloaded.sh
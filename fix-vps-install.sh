#!/bin/bash

# Script para corrigir instalação VPS quando diretório já existe
echo "Corrigindo instalação N.Crisis em /opt/ncrisis..."

# Fazer backup do diretório existente se houver conteúdo importante
if [[ -d "/opt/ncrisis" && "$(ls -A /opt/ncrisis)" ]]; then
    echo "Fazendo backup do diretório existente..."
    mv /opt/ncrisis /opt/ncrisis-backup-$(date +%Y%m%d-%H%M%S)
fi

# Criar diretório limpo
mkdir -p /opt/ncrisis
cd /opt/ncrisis

# Verificar se token está configurado
if [[ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]]; then
    echo "ERRO: GITHUB_PERSONAL_ACCESS_TOKEN não configurado"
    echo "Execute: export GITHUB_PERSONAL_ACCESS_TOKEN=\"seu_token\""
    exit 1
fi

# Clonar repositório
echo "Clonando repositório PrivacyShield..."
git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" .

# Verificar se clone foi bem-sucedido
if [[ ! -f "install-ncrisis.sh" ]]; then
    echo "ERRO: Falha no clone ou arquivo install-ncrisis.sh não encontrado"
    exit 1
fi

# Tornar executável
chmod +x install-ncrisis.sh

echo "Clone realizado com sucesso!"
echo "Para instalar, execute: ./install-ncrisis.sh"
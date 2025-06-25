# Correção Imediata - Repositórios APT Duplicados

## Comando One-Liner para Correção Imediata

Execute no servidor para resolver o problema dos repositórios duplicados:

```bash
sudo rm -f /etc/apt/sources.list.d/ubuntu-mirrors.list && sudo rm -rf /var/lib/apt/lists/* && sudo apt clean && sudo apt update
```

## Comando Completo com Download e Execução

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL"

# Baixar e executar script de correção APT
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/fix-apt-sources.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | sudo bash

# Continuar com instalação N.Crisis
cd /opt/ncrisis && sudo ./install-ncrisis.sh
```

## Verificação Pós-Correção

```bash
# Verificar se warnings sumiram
sudo apt update 2>&1 | grep -c "is configured multiple times" || echo "Correção bem-sucedida"

# Verificar repositórios ativos
sudo apt-cache policy
```

## O que a Correção Faz

1. Remove arquivo `/etc/apt/sources.list.d/ubuntu-mirrors.list` que causa duplicação
2. Limpa cache APT corrompido
3. Recreia sources.list limpo para Ubuntu 22.04
4. Remove outros arquivos problemáticos
5. Atualiza repositórios sem warnings
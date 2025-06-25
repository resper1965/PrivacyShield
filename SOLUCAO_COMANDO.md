# Solução - Comando Não Executa

## Problema
O comando com `SUA_CHAVE_GITHUB` não funciona porque são placeholders que precisam ser substituídos.

## Solução 1: Script Editável

1. Baixe o script:
```bash
curl -o comando-direto.sh https://raw.githubusercontent.com/resper1965/PrivacyShield/main/comando-direto.sh
```

2. Edite o arquivo:
```bash
nano comando-direto.sh
```

3. Cole suas chaves nas linhas 6 e 7:
```bash
GITHUB_TOKEN="ghp_sua_chave_real_aqui"
OPENAI_KEY="sk-proj_sua_chave_real_aqui"
```

4. Execute:
```bash
bash comando-direto.sh
```

## Solução 2: Comando Manual

Substitua as chaves e execute:

```bash
export GITHUB_TOKEN="ghp_sua_chave_github"
export OPENAI_KEY="sk-proj_sua_chave_openai"

curl -H "Authorization: token $GITHUB_TOKEN" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | \
  GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_TOKEN" \
  OPENAI_API_KEY="$OPENAI_KEY" \
  bash
```

## Solução 3: Arquivo Local

1. Crie arquivo com suas chaves:
```bash
cat > install-local.sh << 'EOF'
#!/bin/bash
curl -H "Authorization: token ghp_SUA_CHAVE" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | \
  GITHUB_PERSONAL_ACCESS_TOKEN="ghp_SUA_CHAVE" \
  OPENAI_API_KEY="sk-proj_SUA_CHAVE" \
  bash
EOF
```

2. Edite substituindo as chaves:
```bash
nano install-local.sh
```

3. Execute:
```bash
bash install-local.sh
```

O problema é que você precisa substituir literalmente os textos `SUA_CHAVE_GITHUB` e `SUA_CHAVE_OPENAI` pelos valores reais das suas chaves.
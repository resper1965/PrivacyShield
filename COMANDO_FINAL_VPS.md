# Comando Final - Instalação VPS N.Crisis

## Substitua as Chaves e Execute

```bash
curl -H "Authorization: token SUA_CHAVE_GITHUB" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | \
  GITHUB_PERSONAL_ACCESS_TOKEN="SUA_CHAVE_GITHUB" \
  OPENAI_API_KEY="SUA_CHAVE_OPENAI" \
  bash
```

## Onde Obter as Chaves

### GitHub Token
1. Acesse: https://github.com/settings/tokens
2. Gere token com permissão `repo`
3. Copie o token (começa com `ghp_`)

### OpenAI API Key  
1. Acesse: https://platform.openai.com/api-keys
2. Crie nova chave secreta
3. Copie a chave (começa com `sk-`)

## Exemplo Completo

```bash
# Substitua pelas suas chaves reais
curl -H "Authorization: token ghp_xxxxxxxxxxxxxxxxxx" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | \
  GITHUB_PERSONAL_ACCESS_TOKEN="ghp_xxxxxxxxxxxxxxxxxx" \
  OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxx" \
  bash
```

O script instala automaticamente todo o ambiente e a aplicação N.Crisis em 15-20 minutos.
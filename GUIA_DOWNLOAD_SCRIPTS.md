# Guia de Download dos Scripts N.Crisis

**Repositório**: https://github.com/resper1965/PrivacyShield  
**Domínio**: monster.e-ness.com.br

## URLs de Download Direto

Todos os scripts estão disponíveis para download direto via `raw.githubusercontent.com`:

### Scripts Principais
- **Instalação Completa**: `https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-vps-complete.sh`
- **Docker**: `https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh`
- **Produção**: `https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-production.sh`
- **SSL**: `https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/ssl-setup.sh`
- **Backup**: `https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/backup.sh`

## Autenticação Necessária

Como o repositório é **privado**, todos os downloads precisam de autenticação:

### Método 1: Token no Header (Recomendado)
```bash
# Definir token
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token_aqui"

# Download com autenticação
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-vps-complete.sh \
     -o install-vps.sh
```

### Método 2: Token na URL
```bash
# Download direto com token na URL
curl https://$GITHUB_PERSONAL_ACCESS_TOKEN@raw.githubusercontent.com/resper1965/PrivacyShield/main/install-vps-complete.sh \
     -o install-vps.sh
```

## Comandos de Download Completos

### Instalação Completa
```bash
# OBRIGATÓRIO: Token para repositório privado
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token_aqui"

# Download com autenticação
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-vps-complete.sh \
     -o install-vps.sh

# Executar (o script usa automaticamente o token do ambiente)
chmod +x install-vps.sh
sudo ./install-vps.sh
```

### Scripts Individuais
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token_aqui"

# Docker
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh \
     -o install-docker.sh

# Produção
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-production.sh \
     -o install-production.sh

# SSL
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/ssl-setup.sh \
     -o ssl-setup.sh

# Backup
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/backup.sh \
     -o backup.sh
```

## Verificação de Download

```bash
# Verificar se arquivo foi baixado corretamente
ls -la install-vps.sh

# Verificar conteúdo inicial do script
head -10 install-vps.sh

# Tornar executável
chmod +x *.sh
```

## Troubleshooting

### Erro 404 - Not Found
- Verificar se o token tem permissões corretas
- Verificar se o usuário tem acesso ao repositório
- Verificar se o caminho do arquivo está correto

### Erro 401 - Unauthorized
- Token inválido ou expirado
- Token sem scope `repo` para repositórios privados
- Verificar formato do token

### Erro de Formato
```bash
# Verificar formato do token
echo $GITHUB_PERSONAL_ACCESS_TOKEN | wc -c

# Token clássico: 41 caracteres (ghp_...)
# Token fine-grained: 93+ caracteres (github_pat_...)
```

---

**Atualizado**: 24 de Junho de 2025  
**Versão**: 1.0
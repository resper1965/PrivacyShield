# Guia de Acesso ao Repositório Privado N.Crisis

## Visão Geral

O repositório `https://github.com/resper1965/PrivacyShield.git` é **PRIVADO** e requer autenticação adequada para clonagem e acesso aos scripts de instalação.

## Métodos de Autenticação

### 1. Token de Acesso Pessoal (RECOMENDADO)

#### Criação do Token
1. **Acesse**: https://github.com/settings/tokens
2. **Clique**: "Generate new token (classic)"
3. **Nome**: "N.Crisis Production Access"
4. **Expiração**: 90 days (ou conforme política da empresa)
5. **Selecione os scopes obrigatórios**:
   - ✅ **repo** - Full control of private repositories
   - ✅ **read:org** - Read org and team membership
6. **Clique**: "Generate token"
7. **COPIE IMEDIATAMENTE**: Token só aparece uma vez

#### Formato do Token
```
ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  (40 caracteres)
ou
github_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX  (82+ caracteres)
```

#### Uso do Token
```bash
# Clonar repositório
git clone https://TOKEN@github.com/resper1965/PrivacyShield.git

# Testar acesso
git ls-remote https://TOKEN@github.com/resper1965/PrivacyShield.git

# Download de scripts individuais
curl -H "Authorization: token TOKEN" https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh
```

### 2. Autenticação SSH

#### Configuração SSH
```bash
# 1. Gerar chave SSH
ssh-keygen -t ed25519 -C "admin@e-ness.com.br"

# 2. Adicionar chave ao ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. Copiar chave pública
cat ~/.ssh/id_ed25519.pub

# 4. Adicionar em GitHub: Settings > SSH and GPG keys > New SSH key
```

#### Uso SSH
```bash
# Clonar repositório
git clone git@github.com:resper1965/PrivacyShield.git

# Testar conexão SSH
ssh -T git@github.com
```

### 3. GitHub CLI (Alternativa)

```bash
# Instalar GitHub CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# Autenticar
gh auth login

# Clonar repositório
gh repo clone resper1965/PrivacyShield
```

## Verificação de Acesso

### Testar Conectividade
```bash
# Método 1: Git ls-remote
git ls-remote https://TOKEN@github.com/resper1965/PrivacyShield.git

# Método 2: curl com autenticação
curl -H "Authorization: token TOKEN" https://api.github.com/repos/resper1965/PrivacyShield

# Método 3: SSH
ssh -T git@github.com
```

### Verificar Permissões
```bash
# Listar repositórios acessíveis
curl -H "Authorization: token TOKEN" https://api.github.com/user/repos?type=private

# Verificar acesso específico ao repo
curl -H "Authorization: token TOKEN" https://api.github.com/repos/resper1965/PrivacyShield/collaborators
```

## Problemas Comuns e Soluções

### Erro 404 - Repository not found

**Causas possíveis:**
1. Token sem permissões adequadas
2. Usuário sem acesso ao repositório
3. Token expirado
4. Repository name incorreto

**Soluções:**
```bash
# Verificar se repositório existe
curl -I https://github.com/resper1965/PrivacyShield

# Verificar permissões do token
curl -H "Authorization: token TOKEN" https://api.github.com/user

# Regenerar token com permissões corretas
# Verificar se usuário tem acesso ao repositório
```

### Erro 403 - Permission denied

**Causas possíveis:**
1. Token sem scope 'repo'
2. Usuário não é colaborador
3. Organização com restrições de acesso

**Soluções:**
```bash
# Verificar scopes do token
curl -H "Authorization: token TOKEN" https://api.github.com/user -I | grep X-OAuth-Scopes

# Solicitar acesso ao proprietário do repositório
# Verificar políticas da organização
```

### Erro SSH Permission denied

**Causas possíveis:**
1. Chave SSH não adicionada ao GitHub
2. ssh-agent não rodando
3. Chave não carregada no agent

**Soluções:**
```bash
# Verificar se chave está no GitHub
ssh -T git@github.com

# Adicionar chave ao agent
ssh-add ~/.ssh/id_ed25519

# Verificar configuração SSH
cat ~/.ssh/config
```

## Configuração para Scripts de Instalação

### Variáveis de Ambiente
```bash
# Definir token para scripts
export GITHUB_TOKEN="seu_token_aqui"
export GITHUB_AUTH="https://$GITHUB_TOKEN@github.com/resper1965/PrivacyShield.git"

# Usar em scripts
git clone $GITHUB_AUTH /opt/ncrisis
```

### Download de Scripts Individuais
```bash
# Com autenticação
curl -H "Authorization: token $GITHUB_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh \
     -o install-docker.sh

# Ou usando token na URL (menos seguro)
curl https://TOKEN@raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh \
     -o install-docker.sh
```

## Segurança e Boas Práticas

### Proteção do Token
1. **Nunca commitar** tokens em código
2. **Usar variáveis de ambiente** para tokens
3. **Rotacionar tokens** periodicamente
4. **Usar scopes mínimos** necessários
5. **Revogar tokens** não utilizados

### Exemplo Seguro
```bash
# .bashrc ou .profile
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Script
if [[ -z "$GITHUB_TOKEN" ]]; then
    echo "GITHUB_TOKEN não definido"
    exit 1
fi

git clone "https://$GITHUB_TOKEN@github.com/resper1965/PrivacyShield.git"
```

### Logs e Auditoria
```bash
# Verificar último uso do token
curl -H "Authorization: token TOKEN" https://api.github.com/user/emails

# Listar tokens ativos
# GitHub Settings > Developer settings > Personal access tokens
```

## Suporte

### Comandos de Diagnóstico
```bash
# Informações do usuário autenticado
curl -H "Authorization: token TOKEN" https://api.github.com/user

# Rate limits
curl -H "Authorization: token TOKEN" https://api.github.com/rate_limit

# Organizações do usuário
curl -H "Authorization: token TOKEN" https://api.github.com/user/orgs
```

### Contatos para Acesso
- **Proprietário**: resper1965
- **Repositório**: https://github.com/resper1965/PrivacyShield
- **Suporte**: Solicitar acesso via GitHub Issues ou contato direto

---

**Atualizado**: 24 de Junho de 2025  
**Versão**: 1.0  
**Repositório**: https://github.com/resper1965/PrivacyShield
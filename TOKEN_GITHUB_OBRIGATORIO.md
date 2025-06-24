# Token GitHub Obrigatório - N.Crisis

**Repositório**: https://github.com/resper1965/PrivacyShield  
**Status**: Repositório PRIVADO

## Por que o Token é Obrigatório?

O repositório N.Crisis (`resper1965/PrivacyShield`) é **privado** e requer autenticação para:
1. **Download dos scripts** via `raw.githubusercontent.com`
2. **Clonagem do repositório** durante a instalação
3. **Acesso aos arquivos** de configuração

## Como Obter o Token

### 1. Acessar GitHub Settings
```
https://github.com/settings/tokens
```

### 2. Gerar Novo Token
- Clique em **"Generate new token (classic)"**
- Nome: `N.Crisis VPS Installation`
- Expiração: **90 days** (ou conforme necessário)

### 3. Selecionar Permissões
Marque as seguintes permissões:
- ✓ **repo** (Full control of private repositories)
  - ✓ repo:status
  - ✓ repo_deployment
  - ✓ public_repo
  - ✓ repo:invite
  - ✓ security_events
- ✓ **read:org** (Read org and team membership)

### 4. Copiar Token
- Clique em **"Generate token"**
- **COPIE IMEDIATAMENTE** - só aparece uma vez
- Formato: `ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`

## Como Usar o Token

### Método 1: Variável de Ambiente (Recomendado)
```bash
# Definir token
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_seu_token_completo_aqui"

# Verificar se foi definido
echo "Token: ${GITHUB_PERSONAL_ACCESS_TOKEN:0:10}..."

# Executar instalação
sudo ./install-vps-complete.sh
```

### Método 2: Arquivo de Configuração
```bash
# Salvar em arquivo (cuidado com permissões)
echo "export GITHUB_PERSONAL_ACCESS_TOKEN=\"ghp_seu_token\"" > ~/.github_token
chmod 600 ~/.github_token

# Carregar antes da instalação
source ~/.github_token
sudo ./install-vps-complete.sh
```

## Verificação do Token

### Teste de Acesso
```bash
# Testar acesso ao repositório
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://api.github.com/repos/resper1965/PrivacyShield

# Resposta esperada: JSON com informações do repositório
# Erro 404: Token sem permissões ou inválido
```

### Teste de Download
```bash
# Testar download de arquivo
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/README.md \
     -o test-readme.md

# Verificar se baixou
ls -la test-readme.md
```

## Erros Comuns

### 404 Not Found
```
fatal: repository 'https://github.com/resper1965/PrivacyShield.git/' not found
```
**Causa**: Token sem permissões `repo` ou usuário sem acesso ao repositório

### 401 Unauthorized
```
remote: Invalid username or password.
```
**Causa**: Token inválido, expirado ou mal formatado

### Token Format Error
**Token Clássico**: 40 caracteres, começa com `ghp_`
**Token Fine-grained**: 93+ caracteres, começa com `github_pat_`

## Scripts que Precisam do Token

### Scripts de Instalação
- `install-vps-complete.sh` - Script principal
- `scripts/install-production.sh` - Instalação da aplicação
- Qualquer script que clone o repositório

### Downloads Diretos
- Todos os arquivos via `raw.githubusercontent.com`
- Docker Compose files
- Scripts de configuração

## Segurança do Token

### Boas Práticas
1. **Não commit** o token no código
2. **Usar variável de ambiente** sempre
3. **Definir expiração** adequada
4. **Revogar** após uso se temporário
5. **Permissões mínimas** necessárias

### Revogação
```
https://github.com/settings/tokens
```
Clique em **"Delete"** ao lado do token para revogar.

---

**IMPORTANTE**: Sem o token, a instalação falhará ao tentar clonar o repositório privado.
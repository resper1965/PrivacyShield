# N.Crisis - Comando de Instalação VPS Zerada

## 🚀 Instalação em Uma Linha

Para VPS Ubuntu 22.04 completamente zerada:

```bash
# 1. Configurar credenciais
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token_here"
export OPENAI_API_KEY="sk-proj-your_key_here"

# 2. Executar instalação completa
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -sSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-ncrisis.sh | bash
```

## 📋 Pré-requisitos Mínimos

- **VPS Ubuntu 22.04** (4GB RAM, 40GB storage)
- **Acesso root via SSH**
- **GitHub Personal Access Token**
- **OpenAI API Key** (recomendado)

## 🔑 Como Obter os Tokens

### GitHub Personal Access Token

1. Acesse: https://github.com/settings/tokens
2. Clique "Generate new token (classic)"
3. Marque: `repo` (Full control of private repositories)
4. Copie o token: `ghp_xxxxxxxxxxxxxxxxxx`

### OpenAI API Key

1. Acesse: https://platform.openai.com/api-keys
2. Clique "Create new secret key"
3. Copie a chave: `sk-proj-xxxxxxxxxxxxxxxxxx`

## ⚡ Instalação Passo a Passo

### Conectar à VPS

```bash
ssh root@monster.e-ness.com.br
```

### Configurar Tokens

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_seu_token_github_aqui"
export OPENAI_API_KEY="sk-proj-sua_chave_openai_aqui"
export SENDGRID_API_KEY="SG.sua_chave_sendgrid_aqui"  # Opcional
```

### Executar Instalação

```bash
# Download direto e execução
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -sSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-ncrisis.sh | bash
```

### Verificar Instalação

```bash
# Aguardar finalização (5-15 minutos)
# Verificar serviços
systemctl status ncrisis

# Testar aplicação
curl https://monster.e-ness.com.br/health
```

## 🔧 Opções Avançadas

### Download Separado (Recomendado)

```bash
# Download do script
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -o install-ncrisis.sh \
  https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-ncrisis.sh

# Tornar executável
chmod +x install-ncrisis.sh

# Ver opções disponíveis
./install-ncrisis.sh --help

# Executar com opções
./install-ncrisis.sh --domain=meudominio.com.br
```

### Opções do Script

```bash
# Instalação padrão
./install-ncrisis.sh

# Com domínio customizado
./install-ncrisis.sh --domain=meusite.com.br

# Pular SSL automático
./install-ncrisis.sh --skip-ssl

# Forçar reinstalação
./install-ncrisis.sh --force

# Atualização com backup
./install-ncrisis.sh --update --backup
```

## 📊 O Que é Instalado

**Serviços Configurados:**
- PostgreSQL 15 (banco de dados)
- Redis (cache e filas)
- Node.js 20 (runtime)
- Nginx (proxy reverso)
- ClamAV (antivírus)
- Fail2ban (segurança)
- UFW Firewall

**Aplicação N.Crisis:**
- Backend TypeScript compilado
- Frontend React otimizado
- APIs REST e WebSocket
- Funcionalidades AI completas
- Sistema de monitoramento

**URLs Disponíveis:**
- https://monster.e-ness.com.br (aplicação principal)
- https://monster.e-ness.com.br/busca-ia (chat AI)
- https://monster.e-ness.com.br/health (health check)

## ⏱️ Tempo de Instalação

- **Instalação completa**: 5-15 minutos
- **Dependente de**: velocidade da VPS e internet
- **Logs em tempo real**: visíveis durante execução

## 🚨 Se Algo Der Errado

### Verificar Logs

```bash
# Log da instalação
tail -f /var/log/ncrisis-install.log

# Status dos serviços
systemctl status ncrisis nginx postgresql redis-server

# Logs da aplicação
journalctl -u ncrisis -f
```

### Reinstalar

```bash
# Reinstalação forçada
./install-ncrisis.sh --force
```

### Suporte

```bash
# Script de diagnóstico
/opt/ncrisis/monitor.sh

# Verificar configuração
cat /opt/ncrisis/.env
```

---

**Comando de uma linha para VPS zerada:**

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token" && export OPENAI_API_KEY="sua_chave" && curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" -sSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-ncrisis.sh | bash
```
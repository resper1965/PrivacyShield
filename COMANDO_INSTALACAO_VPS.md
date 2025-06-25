# N.Crisis - Comando de Instalação VPS Zerada

## 🚀 Instalação em Uma Linha

Para VPS Ubuntu 22.04 completamente zerada:

```bash
# 1. Configurar credenciais
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_token_here"
export OPENAI_API_KEY="sk-proj-your_key_here"

# 2. Executar bootstrap (método mais confiável)
bash <(cat << 'EOF'
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/bootstrap-ncrisis.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | bash
EOF
)
```

### Métodos Alternativos

Se o comando acima falhar, use uma das alternativas:

**Método 1: Download direto via API**
```bash
# Download do bootstrap
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/bootstrap-ncrisis.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d > bootstrap-ncrisis.sh

chmod +x bootstrap-ncrisis.sh
./bootstrap-ncrisis.sh
```

**Método 2: Git clone direto**
```bash
# Instalar git se necessário
apt update && apt install -y git

# Clonar e executar
git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" /opt/ncrisis
cd /opt/ncrisis
chmod +x install-ncrisis.sh
./install-ncrisis.sh
```

**Método 3: Instalação manual mínima**
```bash
# Se tudo falhar, script inline
bash <(cat << 'INLINE_EOF'
export GITHUB_PERSONAL_ACCESS_TOKEN="$GITHUB_PERSONAL_ACCESS_TOKEN"
export OPENAI_API_KEY="$OPENAI_API_KEY"

# Instalar dependências básicas
apt update && apt install -y curl wget git nodejs npm postgresql redis-server nginx

# Clonar repositório
cd /opt
git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" ncrisis
cd ncrisis

# Configuração básica
DB_PASSWORD=$(openssl rand -hex 16)
sudo -u postgres psql -c "CREATE USER ncrisis_user WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE ncrisis_db OWNER ncrisis_user;"

# Configurar ambiente
cat > .env << ENV_EOF
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://ncrisis_user:$DB_PASSWORD@localhost:5432/ncrisis_db
OPENAI_API_KEY=$OPENAI_API_KEY
ENV_EOF

# Instalar e iniciar
npm install --production
npm run build
node build/src/server-simple.js &

echo "N.Crisis iniciado em http://localhost:5000"
INLINE_EOF
)
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
# Método recomendado - Bootstrap
bash <(cat << 'EOF'
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/bootstrap-ncrisis.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | bash
EOF
)

# OU método direto via git
git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" /tmp/ncrisis
chmod +x /tmp/ncrisis/install-ncrisis.sh
/tmp/ncrisis/install-ncrisis.sh
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
# Método 1: Via API GitHub
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-ncrisis.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d > install-ncrisis.sh

# Método 2: Via Git Clone
git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" /tmp/repo
cp /tmp/repo/install-ncrisis.sh .
rm -rf /tmp/repo

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

## 📝 Comandos Testados para VPS Zerada

**Comando Bootstrap (Mais Confiável):**
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token" && export OPENAI_API_KEY="sua_chave" && bash <(curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/bootstrap-ncrisis.sh" | grep '"content"' | cut -d'"' -f4 | base64 -d)
```

**Comando Git Clone (Alternativo):**
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token" && export OPENAI_API_KEY="sua_chave" && git clone "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git" /tmp/ncrisis && chmod +x /tmp/ncrisis/install-ncrisis.sh && /tmp/ncrisis/install-ncrisis.sh
```
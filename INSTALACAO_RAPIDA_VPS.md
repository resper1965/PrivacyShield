# Instalação Rápida VPS - N.Crisis v2.1

Guia simplificado para deploy em produção em Ubuntu 22.04.

## ⚡ Instalação Automatizada (Recomendada)

### Pré-requisitos
- Ubuntu 22.04 LTS
- Acesso root via SSH
- Domínio apontado para o servidor

### 1. Configurar Tokens

```bash
# Conectar ao servidor
ssh root@monster.e-ness.com.br

# Configurar credenciais (obrigatório)
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_your_github_token"
export OPENAI_API_KEY="sk-proj-your_openai_key"
export SENDGRID_API_KEY="SG.your_sendgrid_key"  # Opcional
```

### 2. Executar Instalação

```bash
# Download e execução em uma linha
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  -sSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-vps-complete.sh | bash

# OU download separado
wget --header="Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
  https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-vps-complete.sh

chmod +x install-vps-complete.sh
./install-vps-complete.sh
```

### 3. Finalizar Configuração

```bash
cd /opt/ncrisis

# Editar configurações finais
nano .env

# Iniciar serviços
systemctl start ncrisis
systemctl enable ncrisis

# Configurar SSL automático
certbot --nginx -d monster.e-ness.com.br
```

## 🔧 Verificação Rápida

```bash
# Status dos serviços
systemctl status ncrisis nginx postgresql redis-server

# Teste da aplicação
curl https://monster.e-ness.com.br/health

# Teste AI
curl https://monster.e-ness.com.br/api/v1/search/stats
```

## 📱 Interface Web

Acesse: **https://monster.e-ness.com.br**

**Funcionalidades disponíveis:**
- Dashboard com métricas AI em tempo real
- Chat inteligente em `/busca-ia`
- Upload com análise automática de risco
- Relatórios LGPD detalhados
- Configurações AI avançadas

## 🚨 Troubleshooting Rápido

```bash
# Logs da aplicação
journalctl -u ncrisis -f

# Reiniciar se necessário
systemctl restart ncrisis

# Verificar configuração
cat /opt/ncrisis/.env | grep -E "OPENAI|DATABASE|PORT"
```

---

Para configuração avançada, consulte: [GUIA_INSTALACAO_VPS_COMPLETO.md](GUIA_INSTALACAO_VPS_COMPLETO.md)
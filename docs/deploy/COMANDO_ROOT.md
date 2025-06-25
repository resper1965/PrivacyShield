# 🚀 N.Crisis - Instalação Root

## Comando Único para Instalação Root

### Para seu domínio:
```bash
wget -O install-root.sh https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-root.sh && chmod +x install-root.sh && ./install-root.sh monster.e-ness.com.br
```

### Para desenvolvimento local:
```bash
wget -O install-root.sh https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-root.sh && chmod +x install-root.sh && ./install-root.sh localhost
```

### Especificar usuário customizado:
```bash
./install-root.sh monster.e-ness.com.br meuusuario
```

## O que o Script Root Faz

### ✅ Configuração de Usuário
- Cria usuário `ncrisis` (ou especificado)
- Adiciona ao grupo sudo
- Configura permissões corretas

### ✅ Instalação Completa do Sistema
- Ubuntu 22.04 atualizado
- Node.js 20 + npm
- PostgreSQL 14 + Redis
- Nginx + Certbot
- Git e dependências

### ✅ Configuração Automática
- Clone repositório N.Crisis
- Instalação dependências (como usuário)
- Banco PostgreSQL + Redis configurados
- Senhas automáticas geradas
- Configuração .env completa

### ✅ Produção Ready
- Nginx proxy reverso otimizado
- SSL automático (Let's Encrypt)
- Serviço systemd configurado
- Firewall UFW configurado
- Headers de segurança
- Rate limiting

### ✅ Scripts de Gerenciamento
- manage.sh para operações
- Backup automático
- Logs estruturados

## ⏱️ Tempo Total: 15-20 minutos

## 📋 Resultado da Instalação

### URLs Finais:
- **Aplicação**: https://monster.e-ness.com.br
- **Health Check**: https://monster.e-ness.com.br/health
- **API Base**: https://monster.e-ness.com.br/api/v1/

### Credenciais (são exibidas no final):
- **Database**: ncrisis
- **DB User**: ncrisis
- **DB Password**: [gerada automaticamente]
- **Redis Password**: [gerada automaticamente]
- **App User**: ncrisis

### Arquivos Importantes:
- **Aplicação**: `/opt/ncrisis/`
- **Configuração**: `/opt/ncrisis/.env`
- **Nginx**: `/etc/nginx/sites-available/monster.e-ness.com.br`
- **Systemd**: `/etc/systemd/system/ncrisis.service`
- **Logs**: `/var/log/ncrisis-install.log`

## 🔧 Gerenciamento Pós-Instalação

### Comandos Básicos:
```bash
cd /opt/ncrisis

# Status completo
./manage.sh status

# Logs em tempo real
./manage.sh logs

# Restart aplicação
./manage.sh restart

# Backup banco
./manage.sh backup
```

### Configuração API Keys:
```bash
nano /opt/ncrisis/.env
```

Adicione:
```env
OPENAI_API_KEY=sk-sua_chave_aqui
SENDGRID_API_KEY=SG.sua_chave_aqui
```

Reinicie:
```bash
systemctl restart ncrisis
```

### Monitoramento:
```bash
# Status de todos os serviços
systemctl status ncrisis postgresql redis-server nginx

# Health check
curl https://monster.e-ness.com.br/health

# Teste upload
curl -F "file=@test.zip" https://monster.e-ness.com.br/api/v1/archives/upload
```

## 🎯 Recursos Completos

### Frontend
- ✅ Dashboard React moderno
- ✅ Upload drag-and-drop
- ✅ Progresso tempo real
- ✅ Relatórios LGPD
- ✅ Search semântico AI

### Backend
- ✅ API RESTful completa
- ✅ Detecção PII 7 tipos
- ✅ FAISS vector search
- ✅ WebSocket tempo real
- ✅ PostgreSQL + Redis
- ✅ Processamento assíncrono

### Segurança
- ✅ SSL automático
- ✅ Headers seguros
- ✅ Rate limiting
- ✅ Firewall UFW
- ✅ Validação rigorosa
- ✅ Proteção zip-bomb

## ⚠️ Requisitos

- Ubuntu 22.04 LTS
- Acesso root
- Domínio apontado para servidor
- Portas 80, 443 liberadas
- Mínimo 2GB RAM, 20GB disk

---

**Execute como root e aguarde 15-20 minutos para ter o N.Crisis completamente operacional em produção!**
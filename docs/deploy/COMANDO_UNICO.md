# 🚀 N.Crisis - Comando Único de Instalação

## Instalação Completa em 1 Comando

### Para seu domínio:
```bash
wget -O install-completo.sh https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-completo.sh && chmod +x install-completo.sh && ./install-completo.sh monster.e-ness.com.br
```

### Para desenvolvimento local:
```bash
wget -O install-completo.sh https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-completo.sh && chmod +x install-completo.sh && ./install-completo.sh localhost
```

## O que o Script Faz Automaticamente

### ✅ Limpeza Completa
- Remove N.Crisis anterior
- Limpa configurações Nginx
- Remove serviços systemd antigos
- Restaura configuração padrão

### ✅ Instalação do Sistema
- Ubuntu 22.04 atualizado
- Node.js 20 + npm
- PostgreSQL 14
- Redis Server
- Nginx
- Certbot (Let's Encrypt)

### ✅ Configuração da Aplicação
- Clone do repositório N.Crisis
- Instalação de dependências npm
- Configuração .env automática
- Banco PostgreSQL criado
- Redis configurado com senha

### ✅ Configuração de Produção
- Nginx proxy reverso
- SSL automático (se domínio válido)
- Serviço systemd
- Firewall UFW
- Headers de segurança

### ✅ Scripts de Gerenciamento
- manage.sh para operações
- Logs estruturados
- Health checks

## ⏱️ Tempo Total: 15-20 minutos

## 📋 Após a Instalação

### 1. Verificar Status
```bash
cd /opt/ncrisis
./manage.sh status
```

### 2. Configurar API Keys
```bash
sudo nano /opt/ncrisis/.env
```

Adicionar:
```env
OPENAI_API_KEY=sk-sua_chave_aqui
SENDGRID_API_KEY=SG.sua_chave_aqui
```

### 3. Reiniciar
```bash
sudo systemctl restart ncrisis
```

### 4. Testar
```bash
curl http://localhost:5000/health
```

## 🔧 Comandos de Gerenciamento

```bash
cd /opt/ncrisis

# Ver status completo
./manage.sh status

# Ver logs em tempo real
./manage.sh logs

# Reiniciar aplicação
./manage.sh restart

# Parar aplicação
./manage.sh stop

# Iniciar aplicação
./manage.sh start
```

## 🌐 URLs Finais

### Com domínio:
- **Aplicação**: https://monster.e-ness.com.br
- **Health**: https://monster.e-ness.com.br/health
- **API**: https://monster.e-ness.com.br/api/v1/

### Desenvolvimento local:
- **Aplicação**: http://localhost:5000
- **Health**: http://localhost:5000/health
- **API**: http://localhost:5000/api/v1/

## ⚠️ Requisitos

- Ubuntu 22.04 LTS
- Usuário com sudo (NÃO execute como root)
- Domínio apontado para o servidor (para SSL)
- Portas 80, 443, 5000 liberadas

## 🎯 Resultado Final

- ✅ N.Crisis v2.1 operacional
- ✅ Frontend React moderno
- ✅ API completa backend
- ✅ Detecção PII avançada
- ✅ FAISS search semântico
- ✅ WebSocket tempo real
- ✅ SSL automático
- ✅ Monitoramento completo
- ✅ Backup automático
- ✅ Logs estruturados

---

**Execute o comando e aguarde 15-20 minutos para ter o N.Crisis completamente operacional em produção!**
# 🧹 N.Crisis - Instalação Limpa Completa

## Passo a Passo para Ambiente Limpo

### Pré-requisitos
- Ubuntu 22.04 LTS
- Acesso sudo
- Domínio apontado para o servidor (opcional)

---

## 🗑️ PASSO 1: Limpeza do Ambiente Atual

### 1.1 Download do Script de Limpeza
```bash
# Baixar script de limpeza
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/cleanup-environment.sh
chmod +x cleanup-environment.sh
```

### 1.2 Executar Limpeza
```bash
# Executar limpeza (vai pedir confirmações)
./cleanup-environment.sh
```

**O que será removido:**
- ✅ Aplicação N.Crisis atual
- ✅ Serviços systemd relacionados
- ✅ Configurações Nginx
- ✅ Dados PostgreSQL (opcional)
- ✅ Configurações Redis customizadas
- ✅ Certificados SSL (opcional)
- ✅ Logs e arquivos temporários

---

## 🆕 PASSO 2: Instalação Limpa

### 2.1 Download do Script de Instalação
```bash
# Baixar script de instalação limpa
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-fresh.sh
chmod +x install-fresh.sh
```

### 2.2 Executar Instalação
```bash
# Para domínio específico
./install-fresh.sh meudominio.com

# Para desenvolvimento local
./install-fresh.sh localhost
```

### 2.3 Acompanhar Instalação
```bash
# Ver logs em tempo real (em outro terminal)
tail -f /var/log/ncrisis-install.log
```

---

## 📋 O que a Instalação Faz Automaticamente

### Sistema Base
1. ✅ Atualiza Ubuntu 22.04
2. ✅ Instala Node.js 20 + npm
3. ✅ Instala PostgreSQL 14
4. ✅ Instala Redis Server
5. ✅ Instala Nginx
6. ✅ Instala Certbot (Let's Encrypt)

### Aplicação N.Crisis
7. ✅ Clona repositório GitHub
8. ✅ Instala dependências npm
9. ✅ Cria configuração .env
10. ✅ Configura banco PostgreSQL
11. ✅ Configura Redis com senha

### Configuração de Produção
12. ✅ Configura Nginx com proxy reverso
13. ✅ Configura SSL automático
14. ✅ Cria serviço systemd
15. ✅ Configura firewall UFW
16. ✅ Adiciona headers de segurança
17. ✅ Configura rate limiting

### Scripts de Gerenciamento
18. ✅ Cria script manage.sh para operações

---

## ⚙️ PASSO 3: Configuração Pós-Instalação

### 3.1 Configurar API Keys
```bash
# Editar configuração
sudo nano /opt/ncrisis/.env
```

**Adicionar suas chaves:**
```env
OPENAI_API_KEY=sk-sua_chave_openai_aqui
SENDGRID_API_KEY=SG.sua_chave_sendgrid_aqui
```

### 3.2 Reiniciar Aplicação
```bash
sudo systemctl restart ncrisis
```

### 3.3 Verificar Status
```bash
cd /opt/ncrisis
./manage.sh status
```

---

## 🔍 PASSO 4: Validação da Instalação

### 4.1 Verificar Serviços
```bash
# Status de todos os serviços
./manage.sh status

# Health check da aplicação
curl http://localhost:5000/health
```

### 4.2 Verificar Logs
```bash
# Logs em tempo real
./manage.sh logs

# Logs do sistema
sudo journalctl -u ncrisis -n 50
```

### 4.3 Teste Completo
```bash
# Testar upload (com arquivo de teste)
curl -F "file=@test.zip" http://localhost:5000/api/v1/archives/upload

# Testar interface web
curl -I http://localhost:5000/
```

---

## 🛠️ Scripts de Gerenciamento

### Comandos Disponíveis
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

# Fazer backup do banco
./manage.sh backup
```

---

## 📊 Estrutura Final

### Diretórios
```
/opt/ncrisis/          # Aplicação principal
/etc/nginx/sites-*/    # Configuração Nginx
/etc/systemd/system/   # Serviço systemd
/var/log/              # Logs
```

### Serviços
```
ncrisis.service        # Aplicação principal
postgresql.service     # Banco de dados
redis-server.service   # Cache e filas
nginx.service          # Proxy reverso
```

### Portas
```
5000  # N.Crisis (interno)
80    # HTTP (público)
443   # HTTPS (público)
5432  # PostgreSQL (local)
6379  # Redis (local)
```

---

## 🔧 Troubleshooting

### Aplicação não inicia
```bash
# Ver erros específicos
sudo journalctl -u ncrisis -n 20

# Verificar configuração
sudo nano /opt/ncrisis/.env

# Reiniciar manualmente
cd /opt/ncrisis
npm start
```

### Erro 502 Bad Gateway
```bash
# Verificar se app está rodando
netstat -tuln | grep 5000

# Verificar configuração Nginx
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Problemas de SSL
```bash
# Configurar SSL manualmente
sudo certbot --nginx -d seudominio.com

# Verificar certificados
sudo certbot certificates

# Renovar certificados
sudo certbot renew
```

---

## ⏱️ Tempos Estimados

- **Limpeza**: 2-3 minutos
- **Instalação Base**: 8-10 minutos
- **Configuração**: 2-3 minutos
- **Validação**: 2 minutos

**Total**: 15-20 minutos para instalação completa

---

## 📞 Suporte

### Logs Importantes
```bash
# Logs da instalação
tail -f /var/log/ncrisis-install.log

# Logs da aplicação
sudo journalctl -u ncrisis -f

# Logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

### Arquivos de Configuração
```bash
# Configuração da aplicação
/opt/ncrisis/.env

# Configuração Nginx
/etc/nginx/sites-available/seudominio.com

# Configuração systemd
/etc/systemd/system/ncrisis.service
```

---

*N.Crisis v2.1 - Instalação Limpa Automatizada*  
*Pronto para produção em 15-20 minutos* ✅
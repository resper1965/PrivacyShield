# 🚀 Guia de Deploy VPS - N.Crisis v2.1

## Pré-requisitos

### Servidor
- Ubuntu 22.04 LTS (recomendado)
- Mínimo: 2 GB RAM, 20 GB disco
- Recomendado: 4 GB RAM, 40 GB disco
- Usuário com privilégios sudo (não root)

### Domínio
- Domínio registrado e configurado
- DNS apontando para o IP do servidor
- Acesso SSH configurado

### API Keys
- `OPENAI_API_KEY` - Para IA e embeddings
- `SENDGRID_API_KEY` - Para envio de emails (opcional)

## 🔧 Instalação Rápida

### 1. Conectar ao Servidor
```bash
ssh seu-usuario@seu-servidor.com
```

### 2. Baixar Scripts
```bash
# Via curl
curl -O https://raw.githubusercontent.com/resper1965/PrivacyShield/main/deploy-vps.sh
chmod +x deploy-vps.sh

# Ou via git
git clone https://github.com/resper1965/PrivacyShield.git
cd PrivacyShield
```

### 3. Executar Deploy
```bash
./deploy-vps.sh seu-dominio.com
```

**O script irá:**
- Instalar todas as dependências
- Configurar PostgreSQL e Redis
- Compilar a aplicação
- Configurar Nginx e SSL
- Criar serviço systemd
- Configurar firewall

## ⚙️ Configuração Manual de API Keys

Após a instalação, configure suas chaves API:

```bash
sudo nano /opt/ncrisis/.env

# Edite estas linhas:
OPENAI_API_KEY=sua_chave_openai_aqui
SENDGRID_API_KEY=sua_chave_sendgrid_aqui
```

Reinicie o serviço:
```bash
sudo systemctl restart ncrisis
```

## 📊 Monitoramento

### Status do Sistema
```bash
# Status da aplicação
sudo systemctl status ncrisis

# Logs em tempo real
sudo journalctl -u ncrisis -f

# Status do banco
sudo systemctl status postgresql

# Status do Redis
sudo systemctl status redis-server
```

### URLs de Verificação
- **Aplicação**: https://seu-dominio.com
- **Health Check**: https://seu-dominio.com/health
- **API Status**: https://seu-dominio.com/api/queue/status

## 🔄 Operações Comuns

### Restart da Aplicação
```bash
sudo systemctl restart ncrisis
```

### Update da Aplicação
```bash
cd /opt/ncrisis
git pull
npm run build
sudo systemctl restart ncrisis
```

### Backup do Banco
```bash
sudo -u postgres pg_dump ncrisis_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore do Banco
```bash
sudo -u postgres psql ncrisis_prod < backup_arquivo.sql
```

### Verificar Logs
```bash
# Logs da aplicação
sudo journalctl -u ncrisis --since "1 hour ago"

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs de instalação
sudo tail -f /var/log/ncrisis-install.log
```

## 🔒 Segurança

### Firewall (UFW)
```bash
# Status
sudo ufw status

# Permitir porta específica
sudo ufw allow 8080

# Bloquear IP
sudo ufw deny from 192.168.1.100
```

### SSL/HTTPS
```bash
# Renovar certificado
sudo certbot renew

# Verificar certificado
sudo certbot certificates
```

### Fail2Ban
```bash
# Status
sudo fail2ban-client status

# Desbanir IP
sudo fail2ban-client set nginx-http-auth unbanip 192.168.1.100
```

## 🚨 Troubleshooting

### Problema: Aplicação não inicia
```bash
# Verificar logs
sudo journalctl -u ncrisis -n 50

# Verificar configuração
sudo nano /opt/ncrisis/.env

# Verificar banco
sudo -u postgres psql -c "\l"
```

### Problema: Erro 502 Bad Gateway
```bash
# Verificar se aplicação está rodando
sudo systemctl status ncrisis

# Verificar configuração Nginx
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Problema: Banco não conecta
```bash
# Verificar PostgreSQL
sudo systemctl status postgresql

# Verificar conexões
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Problema: SSL não funciona
```bash
# Verificar certificado
sudo certbot certificates

# Renovar manualmente
sudo certbot certonly --nginx -d seu-dominio.com

# Verificar configuração Nginx
sudo nginx -t
```

## 📈 Performance

### Monitorar Recursos
```bash
# CPU e memória
htop

# Espaço em disco
df -h

# Processos Node.js
ps aux | grep node

# Conexões de banco
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
```

### Otimizações
```bash
# Aumentar limites do sistema
echo "fs.file-max = 65536" | sudo tee -a /etc/sysctl.conf

# Otimizar PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf
# shared_buffers = 256MB
# effective_cache_size = 1GB
```

## 🔄 Próxima Versão (Docker)

Para a próxima versão, mantenha estes arquivos:
- `/opt/ncrisis/.env` - Configurações
- Backup do banco PostgreSQL
- Certificados SSL em `/etc/letsencrypt/`

O deploy Docker usará:
```bash
./deploy-docker.sh seu-dominio.com
```

## 📞 Suporte

### Informações do Sistema
```bash
# Versão da aplicação
curl -s https://seu-dominio.com/health | jq .

# Versões instaladas
node --version
npm --version
psql --version
redis-server --version
nginx -v
```

### Contatos de Emergência
- Logs principais: `/var/log/ncrisis-install.log`
- Configuração: `/opt/ncrisis/.env`
- Status: `sudo systemctl status ncrisis`

---

**Instalação típica**: 10-15 minutos  
**Requisitos de sistema**: Ubuntu 22.04 LTS  
**Suporte**: Via logs do sistema e documentação
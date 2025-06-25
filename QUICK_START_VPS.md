# 🚀 Quick Start - Deploy VPS N.Crisis

## ⚡ Instalação Rápida (5 minutos)

### 1. Preparar Servidor
```bash
# Conectar ao seu servidor Ubuntu 22.04
ssh seu-usuario@seu-servidor.com

# Baixar scripts
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/deploy-vps.sh
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/manage-vps.sh
chmod +x deploy-vps.sh manage-vps.sh
```

### 2. Executar Deploy
```bash
# Substitua "seudominio.com" pelo seu domínio real
./deploy-vps.sh seudominio.com
```

### 3. Configurar API Keys
```bash
# Editar configurações
sudo nano /opt/ncrisis/.env

# Adicionar suas chaves:
OPENAI_API_KEY=sk-sua_chave_openai_aqui
SENDGRID_API_KEY=SG.sua_chave_sendgrid_aqui

# Reiniciar aplicação
sudo systemctl restart ncrisis
```

## ✅ Verificar Instalação

### Status Geral
```bash
./manage-vps.sh status
```

### Testar Aplicação
```bash
# Verificar health check
curl https://seudominio.com/health

# Ver logs em tempo real
./manage-vps.sh follow
```

## 🛠️ Comandos Úteis

### Gerenciamento
```bash
./manage-vps.sh start     # Iniciar
./manage-vps.sh stop      # Parar  
./manage-vps.sh restart   # Reiniciar
./manage-vps.sh logs      # Ver logs
./manage-vps.sh backup    # Backup banco
./manage-vps.sh update    # Atualizar app
```

### Monitoramento
```bash
# Status dos serviços
systemctl status ncrisis
systemctl status postgresql  
systemctl status nginx

# Recursos do sistema
htop
df -h
```

## 🔧 Troubleshooting

### Problema: Aplicação não inicia
```bash
# Ver logs detalhados
sudo journalctl -u ncrisis -n 50

# Verificar configuração
sudo nano /opt/ncrisis/.env

# Restart manual
sudo systemctl restart ncrisis
```

### Problema: Erro 502 Bad Gateway
```bash
# Verificar se aplicação está rodando
./manage-vps.sh status

# Verificar porta 5000
netstat -tuln | grep 5000

# Restart nginx
sudo systemctl restart nginx
```

### Problema: SSL não funciona
```bash
# Configurar SSL manualmente
sudo certbot --nginx -d seudominio.com

# Verificar certificado
sudo certbot certificates
```

## 📋 Arquivos Importantes

- **Aplicação**: `/opt/ncrisis/`
- **Configuração**: `/opt/ncrisis/.env`
- **Logs**: `/var/log/ncrisis-install.log`
- **Nginx**: `/etc/nginx/sites-available/seudominio.com`
- **Systemd**: `/etc/systemd/system/ncrisis.service`

## 🔄 Próximos Passos

1. **Testar Upload**: Acesse https://seudominio.com e teste upload de ZIP
2. **Configurar DNS**: Aponte seu domínio para o IP do servidor
3. **Backup Automático**: Configure cron para backups diários
4. **Monitoramento**: Configure alertas de sistema

## 💡 Dicas de Produção

### Performance
```bash
# Verificar recursos
./manage-vps.sh status

# Otimizar PostgreSQL (se necessário)
sudo nano /etc/postgresql/14/main/postgresql.conf
```

### Segurança
```bash
# Verificar firewall
sudo ufw status

# Logs de segurança
sudo journalctl -u fail2ban
```

### Backup Automático
```bash
# Adicionar ao cron (backup diário às 2h)
echo "0 2 * * * /opt/ncrisis/manage-vps.sh backup" | sudo crontab -
```

---

**Tempo total de instalação**: 10-15 minutos  
**Requisitos**: Ubuntu 22.04 LTS, 2GB RAM, domínio configurado  
**Suporte**: Documentação completa em `DEPLOY_VPS_GUIDE.md`
# Guia Passo a Passo - Instalação N.Crisis em VPS

## Pré-requisitos

### Informações Necessárias
- **VPS Ubuntu 22.04+** com acesso root
- **Domínio**: `monster.e-ness.com.br` apontando para o IP da VPS
- **Repositório privado**: `https://github.com/resper1965/PrivacyShield`
- **Token GitHub** ou chave SSH configurada

### Especificações Mínimas
- 4GB RAM (recomendado 8GB)
- 20GB SSD (recomendado 50GB)
- 2 vCPUs (recomendado 4 vCPUs)

## Etapa 1: Preparação da VPS

### 1.1 Conectar à VPS
```bash
ssh root@IP_DA_VPS
```

### 1.2 Configurar DNS (se necessário)
Certifique-se que `monster.e-ness.com.br` aponta para o IP da VPS:
```bash
dig +short monster.e-ness.com.br
```

### 1.3 Executar instalação inicial
```bash
# Download do script de instalação
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh -o install-docker.sh

# Tornar executável e executar
chmod +x install-docker.sh
./install-docker.sh
```

## Etapa 2: Configuração da Aplicação

### 2.1 Trocar para usuário da aplicação
```bash
sudo su - ncrisis
cd /opt/ncrisis
```

### 2.2 Clonar o repositório
```bash
# Usando token do GitHub
git clone https://TOKEN@github.com/resper1965/PrivacyShield.git .

# OU usando SSH (se configurado)
git clone git@github.com:resper1965/PrivacyShield.git .
```

### 2.3 Configurar permissões dos scripts
```bash
chmod +x scripts/*.sh
```

### 2.4 Configurar variáveis de ambiente (opcional)
```bash
# Copiar template de configuração
cp .env.example .env.production

# Editar configurações se necessário
nano .env.production
```

**Tokens e senhas que precisam ser configurados:**
- `OPENAI_API_KEY=sk-proj-1234...` (obter em https://platform.openai.com/api-keys)
- `SENDGRID_API_KEY=SG.1234...` (obter em https://app.sendgrid.com/settings/api_keys)
- `FROM_EMAIL=noreply@e-ness.com.br` (deve estar verificado no SendGrid)
- Outros valores serão gerados automaticamente pelo script de instalação

## Etapa 3: Instalação da Aplicação

### 3.1 Executar instalação da aplicação
```bash
./scripts/install-production.sh
```

Este script irá:
- Verificar requisitos do sistema
- Configurar ambiente de produção
- Construir containers Docker
- Inicializar banco de dados
- Iniciar todos os serviços
- Configurar monitoramento

### 3.2 Verificar instalação
```bash
# Verificar containers rodando
docker ps

# Testar aplicação
curl http://localhost:8000/health

# Ver logs
docker compose -f docker-compose.production.yml logs -f
```

## Etapa 4: Configuração SSL

### 4.1 Sair do usuário ncrisis
```bash
exit  # Voltar para root
```

### 4.2 Configurar SSL
```bash
cd /opt/ncrisis
./scripts/ssl-setup.sh
```

Este script irá:
- Instalar Nginx e Certbot
- Configurar domínio temporário
- Obter certificado Let's Encrypt
- Configurar Nginx com SSL
- Configurar renovação automática

## Etapa 5: Verificação Final

### 5.1 Testar HTTPS
```bash
curl https://monster.e-ness.com.br/health
```

### 5.2 Verificar todos os serviços
```bash
# Status dos containers
docker compose -f /opt/ncrisis/docker-compose.production.yml ps

# Teste de conectividade
curl -f https://monster.e-ness.com.br/api/queue/status

# Verificar SSL
openssl s_client -servername monster.e-ness.com.br -connect monster.e-ness.com.br:443 </dev/null
```

## Etapa 6: Configuração de Backup

### 6.1 Configurar backup automático
```bash
# Adicionar ao crontab do usuário ncrisis
sudo su - ncrisis
crontab -e

# Adicionar linha para backup diário às 2:00
0 2 * * * /usr/local/bin/ncrisis-backup >> /var/log/ncrisis-backup.log 2>&1
```

### 6.2 Testar backup manual
```bash
sudo su - ncrisis
cd /opt/ncrisis
./scripts/backup.sh
```

## Etapa 7: Monitoramento

### 7.1 Verificar health check
```bash
/usr/local/bin/ncrisis-health
```

### 7.2 Configurar alertas (opcional)
Editar `/opt/ncrisis/scripts/health-check.sh` para configurar:
- Email de alertas
- Webhook para notificações
- Thresholds personalizados

## Comandos Úteis de Administração

### Gestão da Aplicação
```bash
# Iniciar aplicação
cd /opt/ncrisis && docker compose -f docker-compose.production.yml up -d

# Parar aplicação
cd /opt/ncrisis && docker compose -f docker-compose.production.yml down

# Reiniciar aplicação
cd /opt/ncrisis && docker compose -f docker-compose.production.yml restart

# Ver logs em tempo real
cd /opt/ncrisis && docker compose -f docker-compose.production.yml logs -f

# Atualizar aplicação
sudo su - ncrisis
cd /opt/ncrisis
./scripts/update.sh
```

### Backup e Restore
```bash
# Criar backup
ncrisis-backup

# Listar backups
ls -la /opt/ncrisis/backups/

# Ver detalhes do backup
cat /opt/ncrisis/backups/ncrisis_backup_YYYYMMDD_HHMMSS_manifest.txt
```

### Monitoramento
```bash
# Verificar saúde
ncrisis-health

# Ver status dos serviços
systemctl status nginx
systemctl status docker

# Verificar recursos
htop
df -h
docker stats
```

### SSL e Certificados
```bash
# Verificar certificado
certbot certificates

# Renovar manualmente
certbot renew

# Testar renovação
certbot renew --dry-run
```

## Resolução de Problemas

### Problema: Container não inicia
```bash
# Ver logs detalhados
docker compose -f /opt/ncrisis/docker-compose.production.yml logs NOME_DO_CONTAINER

# Reiniciar container específico
docker compose -f /opt/ncrisis/docker-compose.production.yml restart NOME_DO_CONTAINER
```

### Problema: Aplicação não responde
```bash
# Verificar se porta está aberta
netstat -tulpn | grep :8000

# Verificar firewall
ufw status

# Reiniciar todos os serviços
cd /opt/ncrisis
docker compose -f docker-compose.production.yml down
docker compose -f docker-compose.production.yml up -d
```

### Problema: SSL não funciona
```bash
# Verificar configuração Nginx
nginx -t

# Ver logs do Nginx
tail -f /var/log/nginx/error.log

# Renovar certificado
certbot renew --force-renewal
```

### Problema: Banco de dados
```bash
# Conectar ao banco
docker exec -it ncrisis_postgres psql -U ncrisis_user -d ncrisis_db

# Verificar conexões ativas
docker exec ncrisis_postgres psql -U ncrisis_user -d ncrisis_db -c "SELECT count(*) FROM pg_stat_activity;"

# Backup emergencial do banco
docker exec ncrisis_postgres pg_dump -U ncrisis_user ncrisis_db > backup_emergencial.sql
```

## URLs de Acesso

Após instalação completa, o sistema estará disponível em:

- **Aplicação Principal**: https://monster.e-ness.com.br
- **Health Check**: https://monster.e-ness.com.br/health
- **API Status**: https://monster.e-ness.com.br/api/queue/status

## Suporte

Para suporte técnico:
- Logs da aplicação: `/opt/ncrisis/logs/`
- Logs do sistema: `/var/log/ncrisis-*.log`
- Configurações: `/opt/ncrisis/.env.production`
- Backups: `/opt/ncrisis/backups/`

## Checklist de Verificação Final

- [ ] VPS configurada com Ubuntu 22.04+
- [ ] DNS apontando corretamente
- [ ] Docker e Docker Compose instalados
- [ ] Aplicação N.Crisis rodando
- [ ] Todos os containers saudáveis
- [ ] HTTPS funcionando com certificado válido
- [ ] Backup automático configurado
- [ ] Monitoramento ativo
- [ ] Firewall configurado
- [ ] Logs rotacionando corretamente
- [ ] Acesso à aplicação via HTTPS funcionando
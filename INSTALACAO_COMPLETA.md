# N.Crisis - Instalação Completa

## Diretórios de Instalação

### Estrutura de Diretórios
```
/opt/
├── ncrisis/          # Aplicação principal N.Crisis
│   ├── src/          # Código fonte TypeScript
│   ├── frontend/     # Interface React
│   ├── uploads/      # Arquivos enviados
│   ├── logs/         # Logs da aplicação
│   ├── tmp/          # Arquivos temporários
│   ├── .env          # Configurações de ambiente
│   └── docker-compose.yml
├── n8n/              # Automação N8N (opcional)
│   ├── .env
│   └── docker-compose.yml
└── outros-servicos/  # Espaço para outras instâncias
```

### Execução dos Scripts
```bash
# Execute sempre no diretório /root
cd /root

# Para repositório público
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-public.sh
sudo bash install-public.sh

# Para repositório privado (com N8N opcional)
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-private.sh
sudo bash install-private.sh
```

## Versão Pública vs Privada

### install-public.sh
- **Repositório**: GitHub público
- **Autenticação**: Não requer token
- **Recursos**: N.Crisis completo
- **Portas**: 5000 (app), 5432 (postgres), 6379 (redis)
- **Domínio**: monster.e-ness.com.br

### install-private.sh
- **Repositório**: GitHub privado com token
- **Autenticação**: GitHub Personal Access Token obrigatório
- **Recursos**: N.Crisis + N8N opcional
- **Portas**: 5000 (ncrisis), 5678 (n8n), 5432 (postgres), 6379 (redis)
- **Domínios**: monster.e-ness.com.br + n8n.monster.e-ness.com.br

## Múltiplas Instâncias

### N8N (Automação)
- **Diretório**: `/opt/n8n/`
- **URL**: `https://n8n.monster.e-ness.com.br`
- **Porta**: 5678
- **Integração**: Webhook automático com N.Crisis

### Outros Serviços Sugeridos
```bash
# Exemplo: Grafana para monitoramento
/opt/grafana/

# Exemplo: Portainer para Docker
/opt/portainer/

# Exemplo: Backup automatizado
/opt/backup/
```

## Comandos Úteis

### N.Crisis
```bash
cd /opt/ncrisis
docker-compose ps                # Status
docker-compose logs -f           # Logs em tempo real
docker-compose restart           # Reiniciar
docker-compose down && docker-compose up -d  # Rebuild
```

### N8N
```bash
cd /opt/n8n
docker-compose ps
docker-compose logs -f
docker-compose restart
```

### Sistema
```bash
systemctl status nginx           # Status Nginx
ufw status                       # Status Firewall
certbot certificates             # Certificados SSL
journalctl -f                    # Logs do sistema
```

## Configuração Pós-Instalação

### 1. Configurar APIs
```bash
# Editar configurações
nano /opt/ncrisis/.env

# Reiniciar após mudanças
cd /opt/ncrisis && docker-compose restart
```

### 2. Backup Automático
```bash
# Adicionar ao crontab
crontab -e

# Backup diário às 2h
0 2 * * * /opt/ncrisis/scripts/backup.sh
```

### 3. Monitoramento
```bash
# Health check N.Crisis
curl https://monster.e-ness.com.br/health

# Health check N8N
curl https://n8n.monster.e-ness.com.br

# Status containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Troubleshooting

### Problemas Comuns
1. **Porta em uso**: Verificar com `netstat -tlnp | grep :5000`
2. **SSL falhou**: Executar manualmente `certbot --nginx -d monster.e-ness.com.br`
3. **Container não inicia**: Verificar logs com `docker-compose logs nome-container`
4. **Banco não conecta**: Verificar credenciais no `.env`

### Logs Importantes
- Instalação: `/var/log/ncrisis-install.log`
- Aplicação: `docker-compose logs -f`
- Nginx: `/var/log/nginx/`
- Sistema: `journalctl -u nginx -f`
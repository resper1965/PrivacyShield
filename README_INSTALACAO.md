# N.Crisis - Instalação Simplificada

## Comando de Instalação VPS

Execute no servidor Ubuntu 22.04 como root:

```bash
curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/install-vps-simples.sh | sudo bash
```

Este script instala tudo automaticamente:
- Node.js 20 + npm limpo
- Docker + Docker Compose 
- PostgreSQL + Redis
- Nginx + SSL automático
- N.Crisis compilado e rodando

**Tempo:** 15-20 minutos para instalação completa

## O Que o Script Faz

1. **Pergunta interativamente**:
   - GitHub token (se tiver repositório privado)
   - Se quer instalar N8N junto
   - OpenAI e SendGrid API keys (opcional)

2. **Instala automaticamente**:
   - Docker e dependências
   - Node.js 20
   - Nginx com SSL
   - PostgreSQL, Redis, ClamAV via containers

3. **Configura tudo**:
   - N.Crisis em `/opt/ncrisis`
   - N8N em `/opt/n8n` (se escolhido)
   - Nginx com proxy reverso
   - SSL automático via Let's Encrypt
   - Firewall configurado

## Após a Instalação

### URLs
- **N.Crisis**: https://monster.e-ness.com.br
- **N8N** (se instalado): https://n8n.monster.e-ness.com.br

### Configurar APIs (se não fez durante instalação)
```bash
# Editar configurações
nano /opt/ncrisis/.env

# Reiniciar aplicação
cd /opt/ncrisis && docker-compose restart
```

### Comandos Úteis
```bash
# Status dos containers
cd /opt/ncrisis && docker-compose ps

# Ver logs em tempo real
cd /opt/ncrisis && docker-compose logs -f

# Reiniciar tudo
cd /opt/ncrisis && docker-compose restart

# Parar tudo
cd /opt/ncrisis && docker-compose down

# Iniciar tudo
cd /opt/ncrisis && docker-compose up -d
```

### N8N (se instalado)
```bash
# Status N8N
cd /opt/n8n && docker-compose ps

# Logs N8N
cd /opt/n8n && docker-compose logs -f

# Login N8N: admin / admin123
```

## Estrutura de Diretórios

```
/opt/
├── ncrisis/              # Aplicação principal
│   ├── src/              # Código fonte
│   ├── frontend/dist/    # Interface compilada
│   ├── uploads/          # Arquivos enviados
│   ├── logs/             # Logs da aplicação
│   ├── .env              # Configurações
│   └── docker-compose.yml
└── n8n/                  # Automação (opcional)
    ├── docker-compose.yml
    └── volumes/
```

## Monitoramento

### Health Checks
```bash
# API N.Crisis
curl https://monster.e-ness.com.br/health

# N8N
curl https://n8n.monster.e-ness.com.br

# Status do sistema
systemctl status nginx
docker ps
ufw status
```

### Logs do Sistema
```bash
# Logs de instalação
tail -f /var/log/ncrisis-install.log

# Logs Nginx
tail -f /var/log/nginx/error.log

# Logs sistema
journalctl -f
```

## Troubleshooting

### Problemas Comuns
1. **SSL falhou**: Execute `certbot --nginx -d monster.e-ness.com.br`
2. **Container não inicia**: Verifique `docker-compose logs nome-container`
3. **Porta ocupada**: Verifique `netstat -tlnp | grep :5000`
4. **API não responde**: Aguarde 2-3 minutos para inicialização completa

### Reinstalação Limpa
```bash
# Parar tudo
cd /opt/ncrisis && docker-compose down
cd /opt/n8n && docker-compose down

# Remover diretórios
rm -rf /opt/ncrisis /opt/n8n

# Executar instalação novamente
curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/install-direto.sh | sudo bash
```

## Múltiplas Instâncias

O sistema está preparado para conviver com outros serviços:

```bash
# Exemplo: Instalar Portainer
docker run -d -p 9000:9000 --name portainer --restart always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data portainer/portainer-ce

# Configurar Nginx para Portainer
# Criar /etc/nginx/sites-available/portainer
# ln -sf /etc/nginx/sites-available/portainer /etc/nginx/sites-enabled/
```

Cada serviço fica isolado em seu próprio diretório `/opt/`, permitindo gerenciamento independente.
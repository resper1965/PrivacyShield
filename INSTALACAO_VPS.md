# Guia Completo de Instalação - n.crisis em VPS Linux

## Requisitos do Sistema

### Especificações Mínimas da VPS
- **OS**: Ubuntu 22.04 LTS ou superior
- **RAM**: 4GB (recomendado 8GB)
- **CPU**: 2 vCPUs (recomendado 4 vCPUs)
- **Armazenamento**: 20GB SSD (recomendado 50GB)
- **Rede**: Porta 80, 443, 8000 abertas

### Software Necessário
- Docker Engine 24.0+
- Docker Compose v2.20+
- Git 2.30+
- Nginx (opcional, para proxy reverso)
- Certbot (para SSL automático)

## Processo de Instalação

### 1. Preparação da VPS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Configurar firewall básico
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8000
sudo ufw --force enable
```

### 2. Instalação do Docker

```bash
# Adicionar repositório oficial do Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Iniciar e habilitar Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verificar instalação
docker --version
docker compose version
```

### 3. Configuração do Ambiente

```bash
# Criar usuário específico para a aplicação
sudo useradd -m -s /bin/bash ncrisis
sudo usermod -aG docker ncrisis

# Criar estrutura de diretórios
sudo mkdir -p /opt/ncrisis
sudo chown ncrisis:ncrisis /opt/ncrisis

# Trocar para usuário da aplicação
sudo su - ncrisis
cd /opt/ncrisis
```

### 4. Clone do Repositório Privado

**IMPORTANTE**: O repositório é privado e requer autenticação válida.

```bash
# MÉTODO 1: Token de Acesso Pessoal (RECOMENDADO)
git clone https://TOKEN@github.com/resper1965/PrivacyShield.git .

# MÉTODO 2: Autenticação SSH (se configurada)
git clone git@github.com:resper1965/PrivacyShield.git .

# MÉTODO 3: Usuário e token
git clone https://usuario:TOKEN@github.com/resper1965/PrivacyShield.git .
```

**Configuração do Token GitHub:**
1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token (classic)"
3. Defina nome: "N.Crisis Production Access"
4. Selecione scopes obrigatórios:
   - ✅ **repo** - Full control of private repositories
   - ✅ **read:org** - Read org and team membership
5. Clique em "Generate token"
6. **IMPORTANTE**: Copie o token imediatamente (só aparece uma vez)
7. Formato: ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

**Verificação de acesso:**
```bash
# Testar se o token funciona
git ls-remote https://TOKEN@github.com/resper1965/PrivacyShield.git
```

### 5. Configuração de Ambiente

```bash
# Copiar arquivo de configuração
cp .env.example .env.production

# Editar configurações de produção
nano .env.production
```

**Configurações importantes a serem alteradas:**
- `OPENAI_API_KEY` - Seu token real da OpenAI (formato: sk-proj-...)
- `SENDGRID_API_KEY` - Sua chave API do SendGrid para envio de emails
- `FROM_EMAIL` - Email remetente (deve estar verificado no SendGrid)
- `DATABASE_URL` - Será configurado automaticamente pelos scripts
- `JWT_SECRET` - Será gerado automaticamente pelos scripts

### 6. Execução da Instalação

```bash
# Tornar script executável
chmod +x scripts/install-production.sh

# Executar instalação completa
./scripts/install-production.sh
```

### 7. Configuração de SSL (Opcional)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Verificação da Instalação

### Testes Básicos
```bash
# Verificar containers em execução
docker ps

# Testar conectividade
curl http://localhost:8000/health

# Verificar logs
docker compose logs -f app
```

### Monitoramento
```bash
# Status dos serviços
docker compose ps

# Uso de recursos
docker stats

# Logs em tempo real
docker compose logs -f
```

## Configuração de Domínio

### DNS Configuration
1. Aponte seu domínio para o IP da VPS
2. Configure registros A e AAAA
3. Aguarde propagação DNS (até 24h)

### Nginx Proxy (Opcional)
```bash
# Instalar Nginx
sudo apt install -y nginx

# Configurar proxy reverso
sudo cp scripts/nginx-config.conf /etc/nginx/sites-available/ncrisis
sudo ln -s /etc/nginx/sites-available/ncrisis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Backup e Manutenção

### Backup Automático
```bash
# Configurar backup diário
sudo crontab -e
# Adicionar: 0 2 * * * /opt/ncrisis/scripts/backup.sh
```

### Atualizações
```bash
# Script de atualização
./scripts/update.sh

# Backup antes da atualização
./scripts/backup.sh
```

## Troubleshooting

### Problemas Comuns

1. **Container não inicia**
   ```bash
   docker compose logs app
   docker compose down && docker compose up -d
   ```

2. **Erro de conexão com banco**
   ```bash
   docker compose exec postgres psql -U ncrisis_user -d ncrisis_db
   ```

3. **Problemas de permissão**
   ```bash
   sudo chown -R ncrisis:ncrisis /opt/ncrisis
   chmod -R 755 /opt/ncrisis/uploads
   ```

4. **SSL não funciona**
   ```bash
   sudo certbot renew --dry-run
   sudo nginx -t
   ```

## Suporte e Contato

Para suporte técnico ou dúvidas sobre a instalação:
- Documentação completa: `/opt/ncrisis/docs/`
- Logs da aplicação: `/opt/ncrisis/logs/`
- Configuração: `/opt/ncrisis/.env.production`

## Segurança

### Recomendações de Segurança
1. Manter sistema sempre atualizado
2. Usar senhas fortes para banco de dados
3. Configurar firewall adequadamente
4. Monitorar logs regularmente
5. Fazer backups frequentes
6. Restringir acesso SSH por chave
7. Usar SSL/TLS sempre que possível

### Hardening Adicional
```bash
# Configurar fail2ban
sudo apt install -y fail2ban
sudo cp scripts/jail.local /etc/fail2ban/

# Configurar logrotate
sudo cp scripts/logrotate.conf /etc/logrotate.d/ncrisis
```

---

**Nota**: Este guia assume conhecimento básico de administração Linux. Para suporte técnico especializado, consulte a documentação técnica completa.
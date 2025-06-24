# Comandos Diretos de Instalação N.Crisis

## Para o servidor monster.e-ness.com.br

Execute estes comandos diretamente no servidor Ubuntu 22.04+:

### Opção 1: Instalação Completa (Recomendado)
```bash
# Download e execução do script completo
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-vps-complete.sh -o install-vps.sh
chmod +x install-vps.sh
./install-vps.sh
```

### Opção 2: Instalação por Etapas

#### 1. Instalar Docker
```bash
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh -o install-docker.sh
chmod +x install-docker.sh
sudo ./install-docker.sh
```

#### 2. Clonar Repositório (como usuário ncrisis)
```bash
sudo su - ncrisis
cd /opt/ncrisis
git clone https://github.com/resper1965/PrivacyShield.git .
```

#### 3. Instalar Aplicação
```bash
chmod +x scripts/*.sh
./scripts/install-production.sh
```

#### 4. Configurar SSL
```bash
exit  # Voltar para root
cd /opt/ncrisis
./scripts/ssl-setup.sh
```

### Opção 3: Scripts Individuais via curl

```bash
# 1. Instalar Docker
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh | sudo bash

# 2. Configurar aplicação (após clonar repositório)
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-production.sh | sudo -u ncrisis bash

# 3. Configurar SSL
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/ssl-setup.sh | sudo bash

# 4. Configurar backup automático
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/backup.sh -o /usr/local/bin/ncrisis-backup
sudo chmod +x /usr/local/bin/ncrisis-backup
```

## URLs dos Scripts Disponíveis

Todos os scripts estão disponíveis em:
- **Base URL**: https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/

**Scripts individuais:**
- `install-docker.sh` - Instalação Docker e dependências
- `install-production.sh` - Instalação da aplicação N.Crisis
- `ssl-setup.sh` - Configuração SSL Let's Encrypt
- `backup.sh` - Script de backup automático
- `update.sh` - Script de atualização
- `health-check.sh` - Monitoramento de saúde
- `nginx-config.conf` - Configuração Nginx

**Script completo:**
- `install-vps-complete.sh` - Instalação completa automatizada

## Verificação Após Instalação

```bash
# Verificar containers rodando
docker ps

# Verificar saúde do sistema
ncrisis-health

# Testar conectividade
curl https://monster.e-ness.com.br/health

# Ver logs
docker compose -f /opt/ncrisis/docker-compose.production.yml logs -f
```

## Troubleshooting

### Se script não for encontrado (404):
```bash
# Verificar se o arquivo existe no repositório
curl -I https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh

# Se não existir, usar script local criado manualmente
```

### Se autenticação GitHub falhar:
```bash
# Usar token de acesso pessoal
git clone https://TOKEN@github.com/resper1965/PrivacyShield.git

# Ou SSH (se configurado)
git clone git@github.com:resper1965/PrivacyShield.git
```

### Se SSL falhar:
```bash
# Verificar DNS
dig +short monster.e-ness.com.br

# Verificar Nginx
nginx -t
systemctl status nginx

# Tentar novamente certificado
certbot --nginx -d monster.e-ness.com.br --force-renewal
```
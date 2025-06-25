# Migração N.Crisis para Traefik + Portainer

## Arquitetura Atual vs Nova

### Atual (Nginx)
```
Internet → Nginx (porta 80/443) → N.Crisis (porta 5000)
PostgreSQL: porta 5433
Redis: porta 6380
```

### Nova (Traefik + Portainer)
```
Internet → Traefik (porta 80/443) → N.Crisis (rede interna)
Portainer: interface web de gerenciamento
PostgreSQL: rede interna (sem exposição externa)
Redis: rede interna (sem exposição externa)
```

## docker-compose.yml com Traefik

```yaml
version: '3.8'

networks:
  traefik:
    external: true
  internal:
    driver: bridge

services:
  app:
    build: .
    networks:
      - traefik
      - internal
    environment:
      - NODE_ENV=production
      - PORT=5000
      - HOST=0.0.0.0
      - DATABASE_URL=postgresql://ncrisis_user:ncrisis_db_password_2025@postgres:5432/ncrisis_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./uploads:/app/uploads
      - /tmp:/tmp
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ncrisis.rule=Host(`monster.e-ness.com.br`)"
      - "traefik.http.routers.ncrisis.tls=true"
      - "traefik.http.routers.ncrisis.tls.certresolver=letsencrypt"
      - "traefik.http.services.ncrisis.loadbalancer.server.port=5000"
      - "traefik.docker.network=traefik"

  postgres:
    image: postgres:15
    networks:
      - internal
    environment:
      - POSTGRES_USER=ncrisis_user
      - POSTGRES_PASSWORD=ncrisis_db_password_2025
      - POSTGRES_DB=ncrisis_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    networks:
      - internal
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Stack Traefik (traefik-stack.yml)

```yaml
version: '3.8'

networks:
  traefik:
    driver: bridge

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"  # Dashboard
    networks:
      - traefik
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik:/etc/traefik
      - ./ssl-certs:/ssl-certs
    command:
      - --api.dashboard=true
      - --api.insecure=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --providers.docker.network=traefik
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.letsencrypt.acme.email=admin@monster.e-ness.com.br
      - --certificatesresolvers.letsencrypt.acme.storage=/ssl-certs/acme.json
      - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.monster.e-ness.com.br`)"
      - "traefik.http.routers.traefik.tls=true"
      - "traefik.http.routers.traefik.service=api@internal"

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    networks:
      - traefik
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.monster.e-ness.com.br`)"
      - "traefik.http.routers.portainer.tls=true"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

volumes:
  portainer_data:
```

## Script de Migração (migrate-to-traefik.sh)

```bash
#!/bin/bash

# Migração N.Crisis para Traefik + Portainer
# Execute na VPS: sudo bash migrate-to-traefik.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash migrate-to-traefik.sh"
    exit 1
fi

echo "=== MIGRAÇÃO PARA TRAEFIK + PORTAINER ==="

INSTALL_DIR="/opt/ncrisis"
TRAEFIK_DIR="/opt/traefik"

# 1. Backup da configuração atual
cd "$INSTALL_DIR"
docker compose down
cp docker-compose.yml docker-compose.nginx.backup
cp .env .env.backup

# 2. Criar diretório Traefik
mkdir -p "$TRAEFIK_DIR/ssl-certs"
chmod 600 "$TRAEFIK_DIR/ssl-certs"

# 3. Parar Nginx
systemctl stop nginx
systemctl disable nginx

# 4. Criar rede Traefik
docker network create traefik 2>/dev/null || true

# 5. Instalar stack Traefik
cd "$TRAEFIK_DIR"
# Criar traefik-stack.yml aqui...

# 6. Iniciar Traefik
docker compose -f traefik-stack.yml up -d

# 7. Atualizar N.Crisis
cd "$INSTALL_DIR"
# Aplicar novo docker-compose.yml...

# 8. Iniciar N.Crisis
docker compose up -d

echo "=== MIGRAÇÃO CONCLUÍDA ==="
echo "🌐 N.Crisis: https://monster.e-ness.com.br"
echo "🐳 Portainer: https://portainer.monster.e-ness.com.br"
echo "🔀 Traefik: https://traefik.monster.e-ness.com.br:8080"
```

## Vantagens da Migração

### Segurança
- **Rede interna isolada**: PostgreSQL e Redis não ficam expostos
- **SSL automático**: Let's Encrypt integrado
- **Headers de segurança**: Automaticamente aplicados

### Gerenciamento
- **Portainer**: Interface visual para containers
- **Traefik Dashboard**: Monitoramento de rotas e SSL
- **Logs centralizados**: Melhor observabilidade

### Escalabilidade
- **Múltiplas aplicações**: Facilita adicionar novos serviços
- **Load balancing**: Suporte nativo para múltiplas instâncias
- **Service discovery**: Automático via Docker labels

### Manutenção
- **SSL automático**: Renovação sem intervenção
- **Zero downtime**: Atualizações sem parada
- **Backup simplificado**: Volumes e configurações isoladas

## DNS Necessário

```
monster.e-ness.com.br          → IP_VPS
portainer.monster.e-ness.com.br → IP_VPS  
traefik.monster.e-ness.com.br   → IP_VPS
```

## Estrutura Final

```
/opt/
├── traefik/
│   ├── traefik-stack.yml
│   └── ssl-certs/
└── ncrisis/
    ├── docker-compose.yml (atualizado)
    ├── .env
    └── uploads/
```

Esta migração mantém toda funcionalidade atual mas com melhor segurança, gerenciamento e escalabilidade.
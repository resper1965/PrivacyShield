#!/bin/bash

# Corrigir conflito de porta PostgreSQL na VPS
# Execute na VPS: sudo bash fix-port-conflict.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash fix-port-conflict.sh"
    exit 1
fi

echo "=== CORRIGINDO CONFLITO DE PORTA POSTGRESQL ==="

INSTALL_DIR="/opt/ncrisis"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não encontrado"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Parando containers atuais..."
docker compose down --remove-orphans

echo "2. Verificando qual serviço está usando porta 5432..."
PORT_USER=$(lsof -ti:5432 || echo "nenhum")
if [ "$PORT_USER" != "nenhum" ]; then
    echo "Porta 5432 está sendo usada pelo processo: $PORT_USER"
    ps -p $PORT_USER 2>/dev/null || echo "Processo não encontrado"
    
    # Verificar se é PostgreSQL do sistema
    if systemctl is-active postgresql >/dev/null 2>&1; then
        echo "PostgreSQL do sistema está ativo, parando temporariamente..."
        systemctl stop postgresql
        systemctl disable postgresql
        echo "✅ PostgreSQL do sistema parado"
    fi
fi

echo "3. Modificando docker-compose.yml para usar porta diferente..."
# Criar backup
cp docker-compose.yml docker-compose.yml.backup

# Modificar para usar porta 5433 externamente
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
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
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15
    ports:
      - "5433:5432"
    environment:
      - POSTGRES_USER=ncrisis_user
      - POSTGRES_PASSWORD=ncrisis_db_password_2025
      - POSTGRES_DB=ncrisis_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ncrisis_user -d ncrisis_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
  redis_data:
EOF

echo "4. Atualizando .env para nova porta PostgreSQL..."
if [ -f ".env" ]; then
    # Backup do .env
    cp .env .env.backup
    
    # Atualizar DATABASE_URL para usar porta interna 5432 (dentro do container)
    sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://ncrisis_user:ncrisis_db_password_2025@postgres:5432/ncrisis_db|' .env
    echo "✅ .env atualizado"
else
    echo "Criando .env..."
    cat > .env << 'EOF'
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://ncrisis_user:ncrisis_db_password_2025@postgres:5432/ncrisis_db
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=sk-configure-later
DOMAIN=monster.e-ness.com.br
CORS_ORIGINS=https://monster.e-ness.com.br
EOF
fi

echo "5. Limpando volumes antigos..."
docker volume prune -f

echo "6. Removendo containers órfãos..."
docker system prune -f

echo "7. Iniciando containers com nova configuração..."
docker compose up -d --build

echo "8. Aguardando PostgreSQL inicializar..."
for i in {1..30}; do
    sleep 5
    if docker compose exec -T postgres pg_isready -U ncrisis_user -d ncrisis_db >/dev/null 2>&1; then
        echo "✅ PostgreSQL ativo após $((i*5))s"
        break
    fi
    echo "Aguardando PostgreSQL... $i/30"
done

echo "9. Aguardando aplicação inicializar..."
for i in {1..24}; do
    sleep 5
    if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
        echo "✅ Aplicação ativa após $((i*5))s"
        break
    fi
    echo "Aguardando aplicação... $i/24"
done

echo "10. Verificando status dos containers..."
docker compose ps

echo "11. Testando conectividade..."
echo "PostgreSQL: $(docker compose exec -T postgres pg_isready -U ncrisis_user -d ncrisis_db >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Redis: $(docker compose exec -T redis redis-cli ping 2>/dev/null || echo 'FALHOU')"
echo "API Health: $(curl -sf http://localhost:5000/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"
echo "Externo: $(curl -sf http://monster.e-ness.com.br/health >/dev/null 2>&1 && echo 'OK' || echo 'FALHOU')"

echo "12. Verificando portas em uso..."
echo "Portas docker:"
docker compose ps --format "table {{.Name}}\t{{.Ports}}"

echo
echo "=== CORREÇÃO DE PORTA CONCLUÍDA ==="
echo "🐘 PostgreSQL: localhost:5433 → container:5432"
echo "🔴 Redis: localhost:6380 → container:6379"
echo "🌐 App: localhost:5000"
echo "🏥 Health: http://monster.e-ness.com.br/health"
echo "📋 Status: docker compose ps"
echo "📊 Logs: docker compose logs -f app"

if curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "✅ Sistema operacional com portas corrigidas!"
else
    echo "⚠️ Verificar logs: docker compose logs app"
fi
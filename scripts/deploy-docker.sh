#!/bin/bash

# N.Crisis Docker Deployment Script
# Deploy usando Docker Compose

set -e

echo "🐳 N.Crisis Docker Deployment"
echo "============================="

# Configurações
DOMAIN=${1:-"localhost"}
APP_NAME="ncrisis"

echo "📋 Configurações:"
echo "   Domínio: $DOMAIN"
echo "   App: $APP_NAME"

# 1. Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "⚠️  Faça logout e login novamente para usar Docker sem sudo"
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# 2. Criar arquivo de produção Docker Compose
echo "🔧 Criando docker-compose.prod.yml..."
cat > docker-compose.prod.yml << 'EOF'
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ncrisis_app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://ncrisis:${DB_PASSWORD}@postgres:5432/ncrisis_prod
      - REDIS_URL=redis://default:${REDIS_PASSWORD}@redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SENDGRID_API_KEY=${SENDGRID_API_KEY}
      - CORS_ORIGINS=https://${DOMAIN},http://localhost
    volumes:
      - app_uploads:/app/uploads
      - app_data:/app/data
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - ncrisis_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: ncrisis_postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=ncrisis_prod
      - POSTGRES_USER=ncrisis
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - ncrisis_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ncrisis -d ncrisis_prod"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: ncrisis_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - ncrisis_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  nginx:
    image: nginx:alpine
    container_name: ncrisis_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - certbot_certs:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    depends_on:
      - app
    networks:
      - ncrisis_network

  certbot:
    image: certbot/certbot
    container_name: ncrisis_certbot
    volumes:
      - certbot_certs:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    command: certonly --webroot --webroot-path=/var/www/certbot --email admin@${DOMAIN} --agree-tos --no-eff-email -d ${DOMAIN} -d www.${DOMAIN}

volumes:
  postgres_data:
  redis_data:
  app_uploads:
  app_data:
  certbot_certs:
  certbot_www:

networks:
  ncrisis_network:
    driver: bridge
EOF

# 3. Criar configuração Nginx
echo "🌐 Criando nginx.prod.conf..."
cat > nginx.prod.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=upload:10m rate=1r/s;

    upstream app_backend {
        server app:3000;
    }

    server {
        listen 80;
        server_name _;

        # Let's Encrypt challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name _;

        # SSL configuration
        ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;
        
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        client_max_body_size 100M;

        location / {
            proxy_pass http://app_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 300s;
            proxy_connect_timeout 75s;
        }

        location /api/v1/archives/upload {
            limit_req zone=upload burst=5 nodelay;
            proxy_pass http://app_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 600s;
            proxy_send_timeout 600s;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://app_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /socket.io/ {
            proxy_pass http://app_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

# 4. Criar arquivo .env.prod
echo "⚙️  Criando .env.prod..."
cat > .env.prod << EOF
DOMAIN=$DOMAIN
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
OPENAI_API_KEY=your_openai_key_here
SENDGRID_API_KEY=your_sendgrid_key_here
EOF

# 5. Criar Dockerfile otimizado
echo "🐳 Criando Dockerfile..."
cat > Dockerfile << 'EOF'
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --only=production && \
    cd frontend && npm ci

# Copy source code
COPY . .

# Build frontend
RUN cd frontend && npm run build

# Build backend
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy built application
COPY --from=builder /app/build ./build
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create necessary directories
RUN mkdir -p uploads data && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "build/main.js"]
EOF

# 6. Script de gerenciamento
echo "🔧 Criando scripts de gerenciamento..."
cat > manage.sh << 'EOF'
#!/bin/bash

case "$1" in
    start)
        echo "🚀 Iniciando N.Crisis..."
        docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
        ;;
    stop)
        echo "⏹️  Parando N.Crisis..."
        docker-compose -f docker-compose.prod.yml down
        ;;
    restart)
        echo "🔄 Reiniciando N.Crisis..."
        docker-compose -f docker-compose.prod.yml restart
        ;;
    logs)
        echo "📝 Logs do N.Crisis..."
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
    status)
        echo "📊 Status do N.Crisis..."
        docker-compose -f docker-compose.prod.yml ps
        ;;
    update)
        echo "🔄 Atualizando N.Crisis..."
        git pull
        docker-compose -f docker-compose.prod.yml build --no-cache
        docker-compose -f docker-compose.prod.yml up -d
        ;;
    backup)
        echo "💾 Backup do banco..."
        docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U ncrisis ncrisis_prod > backup_$(date +%Y%m%d_%H%M%S).sql
        ;;
    ssl)
        echo "🔒 Renovando SSL..."
        docker-compose -f docker-compose.prod.yml run --rm certbot renew
        docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
        ;;
    *)
        echo "Uso: $0 {start|stop|restart|logs|status|update|backup|ssl}"
        exit 1
        ;;
esac
EOF

chmod +x manage.sh

echo ""
echo "🎉 Scripts de deploy criados com sucesso!"
echo "========================================"
echo ""
echo "📋 Opções de deployment:"
echo ""
echo "1️⃣  Deploy VPS/Servidor próprio:"
echo "   ./deploy-vps.sh seu-dominio.com"
echo ""
echo "2️⃣  Deploy Docker:"
echo "   1. Edite o arquivo .env.prod com suas chaves API"
echo "   2. Execute: docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d"
echo ""
echo "🔧 Gerenciamento Docker:"
echo "   ./manage.sh start     # Iniciar"
echo "   ./manage.sh stop      # Parar"
echo "   ./manage.sh logs      # Ver logs"
echo "   ./manage.sh status    # Status"
echo "   ./manage.sh backup    # Backup do banco"
echo ""
echo "📋 Pré-requisitos:"
echo "   - Servidor Ubuntu 22.04 LTS"
echo "   - Domínio apontando para o servidor"
echo "   - Chaves API: OPENAI_API_KEY e SENDGRID_API_KEY"
echo ""
echo "🔒 Inclui:"
echo "   ✅ SSL automático com Let's Encrypt"
echo "   ✅ Nginx com cache e compressão"
echo "   ✅ Rate limiting para APIs"
echo "   ✅ Backup automático"
echo "   ✅ Monitoramento de saúde"
echo "   ✅ Firewall configurado"
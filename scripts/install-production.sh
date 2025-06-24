#!/bin/bash

# N.Crisis Production Installation Script
# Ubuntu 22.04+ VPS Deployment Automation
# Version: 2.0

set -euo pipefail

# Configuration
readonly APP_NAME="ncrisis"
readonly APP_USER="ncrisis"
readonly APP_DIR="/opt/ncrisis"
readonly LOG_FILE="/var/log/ncrisis-install.log"
readonly REQUIRED_DOCKER_VERSION="24.0"
readonly REQUIRED_COMPOSE_VERSION="2.20"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $message" ;;
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Error handler
error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error_exit "Este script não deve ser executado como root. Use o usuário 'ncrisis'."
    fi
}

# Check system requirements
check_system_requirements() {
    log "INFO" "Verificando requisitos do sistema..."
    
    # Check OS
    if [[ ! -f /etc/os-release ]]; then
        error_exit "Sistema operacional não suportado"
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]] || [[ "${VERSION_ID%%.*}" -lt 22 ]]; then
        error_exit "Requer Ubuntu 22.04 ou superior"
    fi
    
    # Check memory
    local memory_gb=$(free -g | awk 'NR==2{printf "%.0f", $2}')
    if [[ $memory_gb -lt 4 ]]; then
        log "WARN" "Memória disponível: ${memory_gb}GB. Recomendado: 8GB+"
    fi
    
    # Check disk space
    local disk_space_gb=$(df -BG "$PWD" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $disk_space_gb -lt 20 ]]; then
        error_exit "Espaço em disco insuficiente: ${disk_space_gb}GB. Mínimo: 20GB"
    fi
    
    log "INFO" "Requisitos do sistema verificados com sucesso"
}

# Check Docker installation
check_docker() {
    log "INFO" "Verificando instalação do Docker..."
    
    if ! command -v docker &> /dev/null; then
        error_exit "Docker não está instalado. Execute primeiro: scripts/install-docker.sh"
    fi
    
    if ! command -v docker &> /dev/null || ! docker compose version &> /dev/null; then
        error_exit "Docker Compose não está instalado corretamente"
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error_exit "Docker daemon não está rodando ou usuário sem permissão"
    fi
    
    # Check versions
    local docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
    local compose_version=$(docker compose version --short | grep -oE '[0-9]+\.[0-9]+')
    
    log "INFO" "Docker versão: $docker_version"
    log "INFO" "Docker Compose versão: $compose_version"
}

# Setup environment configuration
setup_environment() {
    log "INFO" "Configurando ambiente de produção..."
    
    # Create production environment file
    if [[ ! -f .env.production ]]; then
        log "INFO" "Criando arquivo de configuração de produção..."
        cp .env.example .env.production
        
        # Generate secure values
        local jwt_secret=$(openssl rand -hex 32)
        local webhook_secret=$(openssl rand -hex 24)
        local postgres_password=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        
        # Update production values
        sed -i "s|NODE_ENV=development|NODE_ENV=production|g" .env.production
        sed -i "s|your-jwt-secret-here|$jwt_secret|g" .env.production
        sed -i "s|your-webhook-secret|$webhook_secret|g" .env.production
        sed -i "s|ncrisis_pass|$postgres_password|g" .env.production
        sed -i "s|LOG_LEVEL=info|LOG_LEVEL=warn|g" .env.production
        sed -i "s|DEBUG=ncrisis:\*|DEBUG=|g" .env.production
        
        # Configure SendGrid if API key is available
        if [[ -n "$SENDGRID_API_KEY" ]]; then
            sed -i "s|SENDGRID_API_KEY=SG.1234567890abcdef.*|SENDGRID_API_KEY=$SENDGRID_API_KEY|g" .env.production
            log "INFO" "SendGrid API key configurada"
        else
            log "WARN" "SENDGRID_API_KEY não encontrada - emails não serão enviados"
        fi
        
        log "INFO" "Configuração de produção criada. Edite .env.production se necessário."
    fi
    
    # Create required directories
    log "INFO" "Criando diretórios necessários..."
    mkdir -p uploads logs tmp local_files shared_folders
    mkdir -p postgres_data redis_data
    
    # Set proper permissions
    chmod 755 uploads logs local_files shared_folders
    chmod 700 tmp postgres_data redis_data
    
    log "INFO" "Ambiente configurado com sucesso"
}

# Build application containers
build_application() {
    log "INFO" "Construindo containers da aplicação..."
    
    # Pull base images
    docker compose -f docker-compose.production.yml pull --ignore-pull-failures
    
    # Build application containers
    docker compose -f docker-compose.production.yml build --no-cache --parallel
    
    log "INFO" "Containers construídos com sucesso"
}

# Initialize database
initialize_database() {
    log "INFO" "Inicializando banco de dados..."
    
    # Start only database services
    docker compose -f docker-compose.production.yml up -d postgres redis
    
    # Wait for database to be ready
    log "INFO" "Aguardando banco de dados ficar pronto..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if docker compose -f docker-compose.production.yml exec -T postgres pg_isready -U ncrisis_user; then
            log "INFO" "Banco de dados está pronto"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error_exit "Timeout aguardando banco de dados"
        fi
        
        log "DEBUG" "Tentativa $attempt/$max_attempts - aguardando banco..."
        sleep 5
        ((attempt++))
    done
    
    # Run database migrations
    log "INFO" "Executando migrações do banco..."
    docker compose -f docker-compose.production.yml run --rm app npm run db:migrate
    
    log "INFO" "Banco de dados inicializado com sucesso"
}

# Start all services
start_services() {
    log "INFO" "Iniciando todos os serviços..."
    
    # Start all services
    docker compose -f docker-compose.production.yml up -d
    
    # Wait for application to be ready
    log "INFO" "Aguardando aplicação ficar pronta..."
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:8000/health &> /dev/null; then
            log "INFO" "Aplicação está respondendo corretamente"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            log "ERROR" "Aplicação não está respondendo após timeout"
            docker compose -f docker-compose.production.yml logs app
            error_exit "Falha na inicialização da aplicação"
        fi
        
        log "DEBUG" "Tentativa $attempt/$max_attempts - testando aplicação..."
        sleep 10
        ((attempt++))
    done
    
    log "INFO" "Todos os serviços iniciados com sucesso"
}

# Setup monitoring and maintenance
setup_monitoring() {
    log "INFO" "Configurando monitoramento e manutenção..."
    
    # Install maintenance scripts
    sudo cp scripts/backup.sh /usr/local/bin/ncrisis-backup
    sudo cp scripts/update.sh /usr/local/bin/ncrisis-update
    sudo cp scripts/health-check.sh /usr/local/bin/ncrisis-health
    sudo chmod +x /usr/local/bin/ncrisis-*
    
    # Setup logrotate
    sudo tee /etc/logrotate.d/ncrisis > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        docker compose -f $APP_DIR/docker-compose.production.yml restart app
    endscript
}
EOF
    
    # Setup monitoring cron job
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/ncrisis-health >> /var/log/ncrisis-health.log 2>&1") | crontab -
    
    log "INFO" "Monitoramento configurado com sucesso"
}

# Perform final health checks
final_health_check() {
    log "INFO" "Executando verificações finais de saúde..."
    
    # Check all containers are running
    local failed_containers=$(docker compose -f docker-compose.production.yml ps --format "table {{.Service}}\t{{.Status}}" | grep -v "Up" | wc -l)
    if [[ $failed_containers -gt 1 ]]; then  # Header line counts as 1
        log "ERROR" "Alguns containers não estão rodando:"
        docker compose -f docker-compose.production.yml ps
        error_exit "Falha na verificação de containers"
    fi
    
    # Test main endpoints
    local endpoints=("/health" "/api/queue/status")
    for endpoint in "${endpoints[@]}"; do
        if ! curl -f http://localhost:8000$endpoint &> /dev/null; then
            log "WARN" "Endpoint $endpoint não está respondendo"
        else
            log "INFO" "Endpoint $endpoint OK"
        fi
    done
    
    # Check log files
    if [[ ! -d logs ]]; then
        error_exit "Diretório de logs não foi criado"
    fi
    
    # Test file upload capability
    mkdir -p uploads/test
    touch uploads/test/test.txt
    if [[ ! -f uploads/test/test.txt ]]; then
        error_exit "Sistema de arquivos não está funcionando corretamente"
    fi
    rm -rf uploads/test
    
    log "INFO" "Todas as verificações de saúde passaram"
}

# Display final information
show_final_info() {
    log "INFO" "Instalação concluída com sucesso!"
    
    echo ""
    echo "=========================================="
    echo "  N.CRISIS - INSTALAÇÃO CONCLUÍDA"
    echo "=========================================="
    echo ""
    echo "🌐 Aplicação disponível em:"
    echo "   http://$(curl -s ifconfig.me):8000"
    echo "   http://localhost:8000 (local)"
    echo ""
    echo "📊 Monitoramento:"
    echo "   Health Check: http://localhost:8000/health"
    echo "   Queue Status: http://localhost:8000/api/queue/status"
    echo ""
    echo "📁 Diretórios importantes:"
    echo "   Aplicação: $APP_DIR"
    echo "   Logs: $APP_DIR/logs"
    echo "   Uploads: $APP_DIR/uploads"
    echo "   Config: $APP_DIR/.env.production"
    echo ""
    echo "🔧 Comandos úteis:"
    echo "   Ver logs: docker compose -f docker-compose.production.yml logs -f"
    echo "   Parar: docker compose -f docker-compose.production.yml down"
    echo "   Iniciar: docker compose -f docker-compose.production.yml up -d"
    echo "   Backup: ncrisis-backup"
    echo "   Atualizar: ncrisis-update"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Configure seu domínio (se aplicável)"
    echo "   2. Configure SSL com certbot"
    echo "   3. Ajuste as configurações em .env.production"
    echo "   4. Configure backup automático"
    echo ""
    echo "🔐 IMPORTANTE:"
    echo "   - Anote as senhas geradas em .env.production"
    echo "   - Configure firewall adequadamente"
    echo "   - Monitore os logs regularmente"
    echo ""
    echo "=========================================="
}

# Main installation function
main() {
    log "INFO" "Iniciando instalação do N.Crisis em produção..."
    
    # Create log file
    sudo touch "$LOG_FILE"
    sudo chown $USER:$USER "$LOG_FILE"
    
    check_root
    check_system_requirements
    check_docker
    setup_environment
    build_application
    initialize_database
    start_services
    setup_monitoring
    final_health_check
    show_final_info
    
    log "INFO" "Instalação concluída com sucesso!"
}

# Error handling
trap 'error_exit "Script interrompido unexpectedly"' ERR
trap 'log "INFO" "Script de instalação finalizado"' EXIT

# Run main function
main "$@"
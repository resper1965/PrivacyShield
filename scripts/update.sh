#!/bin/bash

# N.Crisis Update Script
# Automated update for production environment

set -euo pipefail

# Configuration
readonly APP_DIR="/opt/ncrisis"
readonly BACKUP_DIR="/opt/ncrisis/backups"
readonly LOG_FILE="/var/log/ncrisis-update.log"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Logging
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

error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Pre-update backup
create_backup() {
    log "INFO" "Criando backup antes da atualização..."
    
    if [[ -f "./scripts/backup.sh" ]]; then
        ./scripts/backup.sh
    else
        error_exit "Script de backup não encontrado"
    fi
    
    log "INFO" "Backup criado com sucesso"
}

# Check for updates
check_updates() {
    log "INFO" "Verificando atualizações disponíveis..."
    
    git fetch origin
    
    local behind_count=$(git rev-list --count HEAD..origin/main)
    if [[ $behind_count -eq 0 ]]; then
        log "INFO" "Sistema já está atualizado"
        exit 0
    fi
    
    log "INFO" "$behind_count commits para atualizar"
}

# Download updates
download_updates() {
    log "INFO" "Baixando atualizações..."
    
    # Stash any local changes
    git stash push -m "Auto-stash before update $TIMESTAMP"
    
    # Pull latest changes
    git pull origin main
    
    log "INFO" "Atualizações baixadas com sucesso"
}

# Stop services
stop_services() {
    log "INFO" "Parando serviços..."
    
    docker compose -f docker-compose.production.yml down
    
    log "INFO" "Serviços parados"
}

# Update dependencies
update_dependencies() {
    log "INFO" "Atualizando dependências..."
    
    # Update backend dependencies
    if [[ -f "package.json" ]]; then
        npm install --production
    fi
    
    # Update frontend dependencies
    if [[ -f "frontend/package.json" ]]; then
        cd frontend
        npm install --production
        cd ..
    fi
    
    log "INFO" "Dependências atualizadas"
}

# Build application
build_application() {
    log "INFO" "Construindo aplicação..."
    
    # Build with no cache to ensure fresh build
    docker compose -f docker-compose.production.yml build --no-cache --parallel
    
    log "INFO" "Aplicação construída com sucesso"
}

# Run database migrations
run_migrations() {
    log "INFO" "Executando migrações do banco..."
    
    # Start only database
    docker compose -f docker-compose.production.yml up -d postgres redis
    
    # Wait for database
    sleep 10
    
    # Run migrations
    docker compose -f docker-compose.production.yml run --rm app npm run db:migrate
    
    log "INFO" "Migrações executadas com sucesso"
}

# Start services
start_services() {
    log "INFO" "Iniciando serviços..."
    
    docker compose -f docker-compose.production.yml up -d
    
    # Wait for application to be ready
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f http://localhost:8000/health &> /dev/null; then
            log "INFO" "Aplicação está respondendo"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error_exit "Aplicação não respondeu após timeout"
        fi
        
        log "DEBUG" "Aguardando aplicação... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    log "INFO" "Serviços iniciados com sucesso"
}

# Verify update
verify_update() {
    log "INFO" "Verificando atualização..."
    
    # Check all containers are running
    local running_containers=$(docker compose -f docker-compose.production.yml ps --services --filter "status=running" | wc -l)
    local total_containers=$(docker compose -f docker-compose.production.yml ps --services | wc -l)
    
    if [[ $running_containers -ne $total_containers ]]; then
        error_exit "Nem todos os containers estão rodando"
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
    
    log "INFO" "Atualização verificada com sucesso"
}

# Clean up old images
cleanup() {
    log "INFO" "Limpando imagens antigas..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old images (keep last 3 versions)
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.ID}}\t{{.CreatedAt}}" | \
    grep ncrisis | \
    tail -n +4 | \
    awk '{print $3}' | \
    xargs -r docker rmi -f 2>/dev/null || true
    
    log "INFO" "Limpeza concluída"
}

# Send notification
send_notification() {
    local current_version=$(git describe --tags --always)
    local previous_version=$(git describe --tags --always HEAD~1)
    
    log "INFO" "Atualização concluída: $previous_version → $current_version"
    
    # Here you can add email notification if configured
    # echo "N.Crisis updated from $previous_version to $current_version" | mail -s "N.Crisis Update Complete" admin@example.com
}

# Rollback function
rollback() {
    log "ERROR" "Iniciando rollback..."
    
    # Stop current services
    docker compose -f docker-compose.production.yml down
    
    # Restore from backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/ncrisis_backup_*_files.tar.gz | head -1)
    if [[ -n "$latest_backup" ]]; then
        log "INFO" "Restaurando do backup: $(basename "$latest_backup")"
        tar -xzf "$latest_backup" -C "$APP_DIR"
    else
        error_exit "Nenhum backup encontrado para rollback"
    fi
    
    # Restart services
    docker compose -f docker-compose.production.yml up -d
    
    log "INFO" "Rollback concluído"
}

# Display update summary
show_summary() {
    local current_version=$(git describe --tags --always)
    local commit_msg=$(git log -1 --pretty=format:"%s")
    
    echo ""
    echo "=========================================="
    echo "  ATUALIZAÇÃO CONCLUÍDA COM SUCESSO"
    echo "=========================================="
    echo ""
    echo "🔄 Versão atual: $current_version"
    echo "📝 Última alteração: $commit_msg"
    echo "📊 Status dos serviços:"
    docker compose -f docker-compose.production.yml ps
    echo ""
    echo "🌐 Aplicação disponível em:"
    echo "   https://monster.e-ness.com.br"
    echo "   http://localhost:8000"
    echo ""
    echo "📋 Comandos úteis:"
    echo "   Ver logs: docker compose -f docker-compose.production.yml logs -f"
    echo "   Status: docker compose -f docker-compose.production.yml ps"
    echo "   Rollback: ./scripts/rollback.sh"
    echo ""
    echo "📝 Log da atualização: $LOG_FILE"
    echo ""
    echo "=========================================="
}

# Main update function
main() {
    log "INFO" "Iniciando atualização do N.Crisis..."
    
    # Create log file if it doesn't exist
    sudo touch "$LOG_FILE"
    sudo chown "$(whoami):$(whoami)" "$LOG_FILE"
    
    # Change to app directory
    cd "$APP_DIR"
    
    # Trap for rollback on error
    trap 'rollback' ERR
    
    create_backup
    check_updates
    download_updates
    stop_services
    update_dependencies
    build_application
    run_migrations
    start_services
    verify_update
    cleanup
    send_notification
    show_summary
    
    log "INFO" "Atualização concluída com sucesso!"
}

# Error handling
trap 'log "INFO" "Script de atualização finalizado"' EXIT

# Check if running in correct directory
if [[ ! -f "docker-compose.production.yml" ]]; then
    error_exit "Execute este script do diretório da aplicação (/opt/ncrisis)"
fi

# Run main function
main "$@"
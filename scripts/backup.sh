#!/bin/bash

# N.Crisis Backup Script
# Automated backup for production environment

set -euo pipefail

# Configuration
readonly APP_DIR="/opt/ncrisis"
readonly BACKUP_DIR="/opt/ncrisis/backups"
readonly TIMESTAMP=$(date +%Y%m%d_%H%M%S)
readonly BACKUP_NAME="ncrisis_backup_${TIMESTAMP}"
readonly RETENTION_DAYS=30
readonly LOG_FILE="/var/log/ncrisis-backup.log"

# Database configuration
readonly DB_CONTAINER="ncrisis_postgres"
readonly DB_USER="ncrisis_user"
readonly DB_NAME="ncrisis_db"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
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
    esac
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

error_exit() {
    log "ERROR" "$1"
    exit 1
}

# Create backup directory
create_backup_dir() {
    log "INFO" "Criando diretório de backup..."
    mkdir -p "$BACKUP_DIR"
    chmod 750 "$BACKUP_DIR"
}

# Backup database
backup_database() {
    log "INFO" "Fazendo backup do banco de dados..."
    
    # Check if database container is running
    if ! docker ps | grep -q "$DB_CONTAINER"; then
        error_exit "Container do banco de dados não está rodando"
    fi
    
    # Create database dump
    docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/${BACKUP_NAME}_database.sql.gz"
    
    if [[ -f "$BACKUP_DIR/${BACKUP_NAME}_database.sql.gz" ]]; then
        log "INFO" "Backup do banco de dados criado com sucesso"
    else
        error_exit "Falha ao criar backup do banco de dados"
    fi
}

# Backup application files
backup_files() {
    log "INFO" "Fazendo backup dos arquivos da aplicação..."
    
    cd "$APP_DIR"
    
    # Create tarball of important directories
    tar -czf "$BACKUP_DIR/${BACKUP_NAME}_files.tar.gz" \
        --exclude="node_modules" \
        --exclude="build" \
        --exclude="dist" \
        --exclude="tmp/*" \
        --exclude="postgres_data" \
        --exclude="redis_data" \
        --exclude="clamav_data" \
        --exclude="logs/*.log" \
        --exclude="backups" \
        .
    
    if [[ -f "$BACKUP_DIR/${BACKUP_NAME}_files.tar.gz" ]]; then
        log "INFO" "Backup dos arquivos criado com sucesso"
    else
        error_exit "Falha ao criar backup dos arquivos"
    fi
}

# Backup uploads and data
backup_uploads() {
    log "INFO" "Fazendo backup dos uploads e dados..."
    
    if [[ -d "$APP_DIR/uploads" ]]; then
        tar -czf "$BACKUP_DIR/${BACKUP_NAME}_uploads.tar.gz" -C "$APP_DIR" uploads/
        log "INFO" "Backup dos uploads criado com sucesso"
    else
        log "WARN" "Diretório de uploads não encontrado"
    fi
    
    if [[ -d "$APP_DIR/local_files" ]]; then
        tar -czf "$BACKUP_DIR/${BACKUP_NAME}_local_files.tar.gz" -C "$APP_DIR" local_files/
        log "INFO" "Backup dos arquivos locais criado com sucesso"
    else
        log "WARN" "Diretório de arquivos locais não encontrado"
    fi
}

# Backup configuration
backup_config() {
    log "INFO" "Fazendo backup das configurações..."
    
    # Backup environment files
    if [[ -f "$APP_DIR/.env.production" ]]; then
        cp "$APP_DIR/.env.production" "$BACKUP_DIR/${BACKUP_NAME}_env.production"
        log "INFO" "Backup da configuração de produção criado"
    fi
    
    # Backup docker compose
    if [[ -f "$APP_DIR/docker-compose.production.yml" ]]; then
        cp "$APP_DIR/docker-compose.production.yml" "$BACKUP_DIR/${BACKUP_NAME}_docker-compose.yml"
        log "INFO" "Backup do docker-compose criado"
    fi
    
    # Backup nginx config if exists
    if [[ -f "/etc/nginx/sites-available/ncrisis" ]]; then
        sudo cp "/etc/nginx/sites-available/ncrisis" "$BACKUP_DIR/${BACKUP_NAME}_nginx.conf"
        sudo chown "$(whoami):$(whoami)" "$BACKUP_DIR/${BACKUP_NAME}_nginx.conf"
        log "INFO" "Backup da configuração do Nginx criado"
    fi
}

# Create backup manifest
create_manifest() {
    log "INFO" "Criando manifesto do backup..."
    
    cat > "$BACKUP_DIR/${BACKUP_NAME}_manifest.txt" << EOF
N.Crisis Backup Manifest
========================
Date: $(date)
Backup Name: $BACKUP_NAME
Host: $(hostname)
User: $(whoami)

Files Included:
- ${BACKUP_NAME}_database.sql.gz (Database dump)
- ${BACKUP_NAME}_files.tar.gz (Application files)
- ${BACKUP_NAME}_uploads.tar.gz (User uploads)
- ${BACKUP_NAME}_local_files.tar.gz (Local files)
- ${BACKUP_NAME}_env.production (Environment config)
- ${BACKUP_NAME}_docker-compose.yml (Docker config)
- ${BACKUP_NAME}_nginx.conf (Nginx config)

Restore Instructions:
1. Stop the application: docker compose -f docker-compose.production.yml down
2. Restore database: gunzip < ${BACKUP_NAME}_database.sql.gz | docker exec -i ncrisis_postgres psql -U $DB_USER $DB_NAME
3. Restore files: tar -xzf ${BACKUP_NAME}_files.tar.gz
4. Restore uploads: tar -xzf ${BACKUP_NAME}_uploads.tar.gz
5. Restore configs and restart application

Backup Size Information:
EOF
    
    # Add file sizes
    for file in "$BACKUP_DIR/${BACKUP_NAME}"*; do
        if [[ -f "$file" ]] && [[ "$file" != *"_manifest.txt" ]]; then
            echo "- $(basename "$file"): $(du -h "$file" | cut -f1)" >> "$BACKUP_DIR/${BACKUP_NAME}_manifest.txt"
        fi
    done
    
    log "INFO" "Manifesto criado com sucesso"
}

# Cleanup old backups
cleanup_old_backups() {
    log "INFO" "Limpando backups antigos (>$RETENTION_DAYS dias)..."
    
    # Find and remove old backup files
    find "$BACKUP_DIR" -name "ncrisis_backup_*" -type f -mtime +$RETENTION_DAYS -delete
    
    local cleaned_count=$(find "$BACKUP_DIR" -name "ncrisis_backup_*" -type f -mtime +$RETENTION_DAYS | wc -l)
    log "INFO" "Removidos $cleaned_count arquivos de backup antigos"
}

# Verify backup integrity
verify_backup() {
    log "INFO" "Verificando integridade do backup..."
    
    # Check if all expected files exist
    local files=(
        "${BACKUP_NAME}_database.sql.gz"
        "${BACKUP_NAME}_files.tar.gz"
        "${BACKUP_NAME}_manifest.txt"
    )
    
    for file in "${files[@]}"; do
        if [[ ! -f "$BACKUP_DIR/$file" ]]; then
            error_exit "Arquivo de backup não encontrado: $file"
        fi
    done
    
    # Test database dump
    if ! gunzip -t "$BACKUP_DIR/${BACKUP_NAME}_database.sql.gz"; then
        error_exit "Backup do banco de dados está corrompido"
    fi
    
    # Test tar files
    if ! tar -tzf "$BACKUP_DIR/${BACKUP_NAME}_files.tar.gz" > /dev/null; then
        error_exit "Backup dos arquivos está corrompido"
    fi
    
    log "INFO" "Backup verificado com sucesso"
}

# Send notification via SendGrid
send_notification() {
    log "INFO" "Enviando notificação de backup..."
    
    # Calculate total backup size
    local total_size=$(du -sh "$BACKUP_DIR/${BACKUP_NAME}"* | awk 'BEGIN{sum=0} {sum+=$1} END{print sum "K"}')
    
    # Send email notification using Node.js script
    if [[ -f "/opt/ncrisis/src/services/emailService.js" ]] && [[ -n "$SENDGRID_API_KEY" ]]; then
        node -e "
        const emailService = require('/opt/ncrisis/src/services/emailService.js');
        emailService.sendNotificationEmail(
            '${ALERT_EMAIL:-admin@e-ness.com.br}',
            {
                recipientName: 'Administrador',
                alertType: 'backup',
                message: 'Backup do N.Crisis foi concluído com sucesso.',
                details: {
                    'Backup': '$BACKUP_NAME',
                    'Tamanho Total': '$total_size',
                    'Servidor': '$(hostname)',
                    'Data/Hora': '$(date)'
                }
            }
        ).then(success => {
            if (success) {
                console.log('Email de notificação enviado com sucesso');
            } else {
                console.log('Falha ao enviar email de notificação');
            }
        });
        " 2>/dev/null || log "WARN" "Falha ao enviar notificação por email"
    else
        log "WARN" "SendGrid não configurado - notificação por email não enviada"
    fi
    
    log "INFO" "Backup $BACKUP_NAME concluído. Tamanho total: $total_size"
}

# Display backup summary
show_summary() {
    echo ""
    echo "=========================================="
    echo "  BACKUP CONCLUÍDO COM SUCESSO"
    echo "=========================================="
    echo ""
    echo "📁 Nome do backup: $BACKUP_NAME"
    echo "📂 Localização: $BACKUP_DIR"
    echo "📊 Arquivos criados:"
    
    for file in "$BACKUP_DIR/${BACKUP_NAME}"*; do
        if [[ -f "$file" ]]; then
            echo "   - $(basename "$file") ($(du -h "$file" | cut -f1))"
        fi
    done
    
    echo ""
    echo "📋 Para restaurar este backup:"
    echo "   cat $BACKUP_DIR/${BACKUP_NAME}_manifest.txt"
    echo ""
    echo "🗑️  Backups mantidos por $RETENTION_DAYS dias"
    echo "📝 Log: $LOG_FILE"
    echo ""
    echo "=========================================="
}

# Main backup function
main() {
    log "INFO" "Iniciando backup do N.Crisis..."
    
    # Create log file if it doesn't exist
    sudo touch "$LOG_FILE"
    sudo chown "$(whoami):$(whoami)" "$LOG_FILE"
    
    create_backup_dir
    backup_database
    backup_files
    backup_uploads
    backup_config
    create_manifest
    verify_backup
    cleanup_old_backups
    send_notification
    show_summary
    
    log "INFO" "Backup concluído com sucesso!"
}

# Error handling
trap 'error_exit "Backup interrompido unexpectedly"' ERR
trap 'log "INFO" "Script de backup finalizado"' EXIT

# Check if running in correct directory
if [[ ! -f "docker-compose.production.yml" ]]; then
    error_exit "Execute este script do diretório da aplicação (/opt/ncrisis)"
fi

# Run main function
main "$@"
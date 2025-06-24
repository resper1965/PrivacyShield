#!/bin/bash

# N.Crisis Health Check Script
# Monitors application health and performance

set -euo pipefail

# Configuration
readonly APP_DIR="/opt/ncrisis"
readonly LOG_FILE="/var/log/ncrisis-health.log"
readonly ALERT_EMAIL="admin@e-ness.com.br"
readonly WEBHOOK_URL=""  # Add webhook URL if needed

# Thresholds
readonly CPU_THRESHOLD=80
readonly MEMORY_THRESHOLD=80
readonly DISK_THRESHOLD=85
readonly RESPONSE_TIME_THRESHOLD=5000  # milliseconds

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly NC='\033[0m'

# Health status
HEALTH_STATUS="HEALTHY"
ISSUES=()

# Logging
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Add issue to tracking
add_issue() {
    local severity=$1
    shift
    local message="$*"
    
    ISSUES+=("[$severity] $message")
    
    case $severity in
        "CRITICAL"|"ERROR")
            HEALTH_STATUS="UNHEALTHY"
            ;;
        "WARNING")
            if [[ "$HEALTH_STATUS" == "HEALTHY" ]]; then
                HEALTH_STATUS="DEGRADED"
            fi
            ;;
    esac
    
    log "$severity" "$message"
}

# Check container health
check_containers() {
    local containers=("ncrisis_app" "ncrisis_postgres" "ncrisis_redis" "ncrisis_clamav")
    
    for container in "${containers[@]}"; do
        if ! docker ps --format "table {{.Names}}" | grep -q "^$container$"; then
            add_issue "CRITICAL" "Container $container não está rodando"
        else
            # Check container health status
            local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
            if [[ "$health_status" == "unhealthy" ]]; then
                add_issue "ERROR" "Container $container não está saudável"
            elif [[ "$health_status" == "starting" ]]; then
                add_issue "WARNING" "Container $container ainda está iniciando"
            fi
        fi
    done
}

# Check application endpoints
check_endpoints() {
    local endpoints=(
        "http://localhost:8000/health"
        "http://localhost:8000/api/queue/status"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local start_time=$(date +%s%3N)
        
        if curl -f -s -m 10 "$endpoint" > /dev/null; then
            local end_time=$(date +%s%3N)
            local response_time=$((end_time - start_time))
            
            if [[ $response_time -gt $RESPONSE_TIME_THRESHOLD ]]; then
                add_issue "WARNING" "Endpoint $endpoint respondendo lentamente: ${response_time}ms"
            fi
        else
            add_issue "CRITICAL" "Endpoint $endpoint não está respondendo"
        fi
    done
}

# Check database connectivity
check_database() {
    if ! docker exec ncrisis_postgres pg_isready -U ncrisis_user > /dev/null 2>&1; then
        add_issue "CRITICAL" "Banco de dados não está respondendo"
        return
    fi
    
    # Check database connections
    local active_connections=$(docker exec ncrisis_postgres psql -U ncrisis_user -d ncrisis_db -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | tr -d ' ')
    if [[ $active_connections -gt 50 ]]; then
        add_issue "WARNING" "Muitas conexões ativas no banco: $active_connections"
    fi
    
    # Check database size
    local db_size_mb=$(docker exec ncrisis_postgres psql -U ncrisis_user -d ncrisis_db -t -c "SELECT pg_size_pretty(pg_database_size('ncrisis_db'));" 2>/dev/null | tr -d ' ')
    log "INFO" "Tamanho do banco de dados: $db_size_mb"
}

# Check Redis connectivity
check_redis() {
    if ! docker exec ncrisis_redis redis-cli ping > /dev/null 2>&1; then
        add_issue "CRITICAL" "Redis não está respondendo"
        return
    fi
    
    # Check Redis memory usage
    local redis_memory=$(docker exec ncrisis_redis redis-cli info memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')
    log "INFO" "Uso de memória Redis: $redis_memory"
}

# Check system resources
check_system_resources() {
    # Check CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    
    if [[ $cpu_usage -gt $CPU_THRESHOLD ]]; then
        add_issue "WARNING" "Alto uso de CPU: ${cpu_usage}%"
    fi
    
    # Check memory usage
    local memory_info=$(free | grep Mem)
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$((used_memory * 100 / total_memory))
    
    if [[ $memory_usage -gt $MEMORY_THRESHOLD ]]; then
        add_issue "WARNING" "Alto uso de memória: ${memory_usage}%"
    fi
    
    # Check disk usage
    local disk_usage=$(df "$APP_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [[ $disk_usage -gt $DISK_THRESHOLD ]]; then
        add_issue "ERROR" "Alto uso de disco: ${disk_usage}%"
    fi
    
    log "INFO" "Recursos do sistema - CPU: ${cpu_usage}%, Memória: ${memory_usage}%, Disco: ${disk_usage}%"
}

# Check log files for errors
check_logs() {
    local error_count=0
    
    # Check application logs for recent errors
    if [[ -d "$APP_DIR/logs" ]]; then
        error_count=$(find "$APP_DIR/logs" -name "*.log" -mtime -1 -exec grep -i "error\|exception\|failed" {} \; | wc -l)
    fi
    
    # Check Docker logs for errors
    local docker_errors=$(docker compose -f "$APP_DIR/docker-compose.production.yml" logs --since=1h 2>&1 | grep -i "error\|exception\|failed" | wc -l)
    error_count=$((error_count + docker_errors))
    
    if [[ $error_count -gt 10 ]]; then
        add_issue "WARNING" "Muitos erros encontrados nos logs: $error_count"
    elif [[ $error_count -gt 50 ]]; then
        add_issue "ERROR" "Número crítico de erros nos logs: $error_count"
    fi
    
    log "INFO" "Erros encontrados nos logs: $error_count"
}

# Check SSL certificate
check_ssl() {
    local domain="monster.e-ness.com.br"
    local cert_file="/etc/letsencrypt/live/$domain/fullchain.pem"
    
    if [[ -f "$cert_file" ]]; then
        local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_timestamp=$(date -d "$expiry_date" +%s)
        local current_timestamp=$(date +%s)
        local days_until_expiry=$(( (expiry_timestamp - current_timestamp) / 86400 ))
        
        if [[ $days_until_expiry -lt 7 ]]; then
            add_issue "CRITICAL" "Certificado SSL expira em $days_until_expiry dias"
        elif [[ $days_until_expiry -lt 30 ]]; then
            add_issue "WARNING" "Certificado SSL expira em $days_until_expiry dias"
        fi
        
        log "INFO" "Certificado SSL válido por mais $days_until_expiry dias"
    else
        add_issue "WARNING" "Certificado SSL não encontrado"
    fi
}

# Check backup status
check_backups() {
    local backup_dir="$APP_DIR/backups"
    
    if [[ -d "$backup_dir" ]]; then
        local latest_backup=$(find "$backup_dir" -name "ncrisis_backup_*_manifest.txt" -mtime -1 | head -1)
        
        if [[ -z "$latest_backup" ]]; then
            add_issue "WARNING" "Nenhum backup recente encontrado (últimas 24h)"
        else
            log "INFO" "Backup recente encontrado: $(basename "$latest_backup")"
        fi
    else
        add_issue "WARNING" "Diretório de backup não encontrado"
    fi
}

# Send alert notification via SendGrid
send_alert() {
    if [[ ${#ISSUES[@]} -eq 0 ]]; then
        return
    fi
    
    local subject="N.Crisis Health Alert - $HEALTH_STATUS"
    
    # Prepare details for email
    local details_json="{"
    local first=true
    for issue in "${ISSUES[@]}"; do
        if [[ $first == true ]]; then
            first=false
        else
            details_json+=","
        fi
        details_json+="\"Issue\": \"$issue\""
    done
    details_json+="}"
    
    # Send email notification using Node.js script
    if [[ -f "/opt/ncrisis/src/services/emailService.js" ]] && [[ -n "$SENDGRID_API_KEY" ]]; then
        node -e "
        const emailService = require('/opt/ncrisis/src/services/emailService.js');
        emailService.sendNotificationEmail(
            '${ALERT_EMAIL:-admin@e-ness.com.br}',
            {
                recipientName: 'Administrador',
                alertType: 'health',
                message: 'Verificação de saúde do N.Crisis detectou problemas que requerem atenção.',
                details: {
                    'Status': '$HEALTH_STATUS',
                    'Servidor': '$(hostname)',
                    'Problemas Detectados': '${#ISSUES[@]}',
                    'Data/Hora': '$(date)',
                    'Log File': '$LOG_FILE'
                },
                actionUrl: 'https://monster.e-ness.com.br/health'
            }
        ).then(success => {
            if (success) {
                console.log('Alerta de saúde enviado com sucesso');
            } else {
                console.log('Falha ao enviar alerta de saúde');
            }
        });
        " 2>/dev/null || log "WARN" "Falha ao enviar alerta por email"
    else
        log "WARN" "SendGrid não configurado - alerta por email não enviado"
    fi
    
    # Send webhook if configured
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -X POST "$WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"text\":\"$subject\",\"status\":\"$HEALTH_STATUS\",\"issues\":${#ISSUES[@]},\"host\":\"$(hostname)\"}" 2>/dev/null || true
    fi
    
    log "ALERT" "Alerta enviado: $subject"
}

# Generate health report
generate_report() {
    local report_file="$APP_DIR/logs/health-report-$(date +%Y%m%d).json"
    
    cat > "$report_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "status": "$HEALTH_STATUS",
    "hostname": "$(hostname)",
    "checks": {
        "containers": "$(docker ps --format "{{.Names}}" | grep ncrisis | wc -l) containers running",
        "endpoints": "$(check_endpoints > /dev/null 2>&1 && echo "responsive" || echo "issues detected")",
        "database": "$(check_database > /dev/null 2>&1 && echo "healthy" || echo "issues detected")",
        "redis": "$(check_redis > /dev/null 2>&1 && echo "healthy" || echo "issues detected")"
    },
    "issues_count": ${#ISSUES[@]},
    "issues": [
        $(printf '"%s",' "${ISSUES[@]}" | sed 's/,$//')
    ]
}
EOF
    
    log "INFO" "Relatório de saúde gerado: $report_file"
}

# Main health check function
main() {
    log "INFO" "Iniciando verificação de saúde do N.Crisis"
    
    # Create log file if it doesn't exist
    if [[ ! -f "$LOG_FILE" ]]; then
        sudo touch "$LOG_FILE"
        sudo chown "$(whoami):$(whoami)" "$LOG_FILE"
    fi
    
    check_containers
    check_endpoints
    check_database
    check_redis
    check_system_resources
    check_logs
    check_ssl
    check_backups
    
    # Send alert if there are issues
    if [[ ${#ISSUES[@]} -gt 0 ]]; then
        send_alert
    fi
    
    generate_report
    
    log "INFO" "Verificação de saúde concluída - Status: $HEALTH_STATUS"
    
    # Exit with appropriate code
    case "$HEALTH_STATUS" in
        "HEALTHY") exit 0 ;;
        "DEGRADED") exit 1 ;;
        "UNHEALTHY") exit 2 ;;
    esac
}

# Run main function
main "$@"
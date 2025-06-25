#!/bin/bash

# N.Crisis VPS Management Script v2.1
# Gerenciamento completo da aplicação em produção

set -e

APP_DIR="/opt/ncrisis"
SERVICE_NAME="ncrisis"
LOG_FILE="/var/log/ncrisis-install.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função de log com cores
log() {
    echo -e "${BLUE}$(date '+%Y-%m-%d %H:%M:%S')${NC} - $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Verificar se está rodando como usuário correto
check_user() {
    if [ "$EUID" -eq 0 ]; then
        error "Não execute como root. Use um usuário com sudo."
        exit 1
    fi
}

# Mostrar status geral
show_status() {
    log "📊 Status N.Crisis"
    echo "=================="
    
    # Status do serviço
    if systemctl is-active --quiet $SERVICE_NAME; then
        success "Aplicação: Rodando"
    else
        error "Aplicação: Parada"
    fi
    
    # Status do PostgreSQL
    if systemctl is-active --quiet postgresql; then
        success "PostgreSQL: Rodando"
    else
        error "PostgreSQL: Parado"
    fi
    
    # Status do Redis
    if systemctl is-active --quiet redis-server; then
        success "Redis: Rodando"
    else
        error "Redis: Parado"
    fi
    
    # Status do Nginx
    if systemctl is-active --quiet nginx; then
        success "Nginx: Rodando"
    else
        error "Nginx: Parado"
    fi
    
    # Verificar porta 5000
    if netstat -tuln | grep -q ":5000 "; then
        success "Porta 5000: Aberta"
    else
        warning "Porta 5000: Fechada"
    fi
    
    # Espaço em disco
    DISK_USAGE=$(df -h $APP_DIR | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        success "Disco: ${DISK_USAGE}% usado"
    else
        warning "Disco: ${DISK_USAGE}% usado (>80%)"
    fi
    
    # Memória
    MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ "$MEM_USAGE" -lt 80 ]; then
        success "Memória: ${MEM_USAGE}% usada"
    else
        warning "Memória: ${MEM_USAGE}% usada (>80%)"
    fi
}

# Iniciar aplicação
start_app() {
    log "🚀 Iniciando N.Crisis..."
    
    sudo systemctl start $SERVICE_NAME
    sudo systemctl start nginx
    sudo systemctl start postgresql
    sudo systemctl start redis-server
    
    sleep 5
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        success "N.Crisis iniciado com sucesso"
    else
        error "Falha ao iniciar N.Crisis"
        show_logs
        exit 1
    fi
}

# Parar aplicação
stop_app() {
    log "⏹️  Parando N.Crisis..."
    
    sudo systemctl stop $SERVICE_NAME
    
    success "N.Crisis parado"
}

# Reiniciar aplicação
restart_app() {
    log "🔄 Reiniciando N.Crisis..."
    
    stop_app
    sleep 2
    start_app
}

# Mostrar logs
show_logs() {
    log "📋 Logs da aplicação (últimas 50 linhas):"
    echo "========================================"
    
    sudo journalctl -u $SERVICE_NAME -n 50 --no-pager
}

# Seguir logs em tempo real
follow_logs() {
    log "📋 Seguindo logs em tempo real (Ctrl+C para sair):"
    echo "=============================================="
    
    sudo journalctl -u $SERVICE_NAME -f
}

# Backup do banco de dados
backup_database() {
    log "💾 Criando backup do banco..."
    
    BACKUP_DIR="/opt/ncrisis/backups"
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    sudo mkdir -p "$BACKUP_DIR"
    
    sudo -u postgres pg_dump ncrisis_prod > "$BACKUP_DIR/$BACKUP_FILE"
    
    if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
        success "Backup criado: $BACKUP_DIR/$BACKUP_FILE"
    else
        error "Falha ao criar backup"
        exit 1
    fi
}

# Atualizar aplicação
update_app() {
    log "📥 Atualizando N.Crisis..."
    
    cd $APP_DIR
    
    # Backup antes da atualização
    backup_database
    
    # Parar aplicação
    stop_app
    
    # Atualizar código
    git pull
    
    # Instalar dependências
    npm ci
    
    # Compilar frontend
    npm run build
    
    # Migrar banco se necessário
    npx prisma db push
    
    # Reiniciar aplicação
    start_app
    
    success "Atualização concluída"
}

# Configurar SSL
setup_ssl() {
    local domain=$1
    
    if [ -z "$domain" ]; then
        error "Domínio é obrigatório para SSL"
        echo "Uso: $0 ssl seu-dominio.com"
        exit 1
    fi
    
    log "🔒 Configurando SSL para $domain..."
    
    sudo certbot --nginx -d "$domain" --non-interactive --agree-tos --email admin@"$domain"
    
    if [ $? -eq 0 ]; then
        success "SSL configurado para $domain"
    else
        error "Falha ao configurar SSL"
        exit 1
    fi
}

# Verificar saúde da aplicação
health_check() {
    log "🏥 Verificando saúde da aplicação..."
    
    # Verificar se a aplicação responde
    if curl -f -s http://localhost:5000/health > /dev/null; then
        success "Health check: OK"
    else
        error "Health check: FALHA"
        return 1
    fi
    
    # Verificar banco de dados
    if sudo -u postgres psql -d ncrisis_prod -c "SELECT 1;" > /dev/null 2>&1; then
        success "Banco de dados: OK"
    else
        error "Banco de dados: FALHA"
        return 1
    fi
    
    # Verificar Redis
    if redis-cli ping > /dev/null 2>&1; then
        success "Redis: OK"
    else
        error "Redis: FALHA"
        return 1
    fi
    
    return 0
}

# Limpar logs antigos
cleanup_logs() {
    log "🧹 Limpando logs antigos..."
    
    # Limpar logs do systemd (manter apenas 7 dias)
    sudo journalctl --vacuum-time=7d
    
    # Limpar logs do Nginx (manter apenas 30 dias)
    sudo find /var/log/nginx/ -name "*.log.*" -mtime +30 -delete
    
    # Limpar backups antigos (manter apenas 30 dias)
    sudo find /opt/ncrisis/backups/ -name "*.sql" -mtime +30 -delete
    
    success "Limpeza concluída"
}

# Mostrar ajuda
show_help() {
    echo "N.Crisis VPS Management v2.1"
    echo "============================="
    echo ""
    echo "Uso: $0 [comando] [opções]"
    echo ""
    echo "Comandos:"
    echo "  status     - Mostrar status geral"
    echo "  start      - Iniciar aplicação"
    echo "  stop       - Parar aplicação"
    echo "  restart    - Reiniciar aplicação"
    echo "  logs       - Mostrar logs recentes"
    echo "  follow     - Seguir logs em tempo real"
    echo "  backup     - Criar backup do banco"
    echo "  update     - Atualizar aplicação"
    echo "  ssl [dom]  - Configurar SSL para domínio"
    echo "  health     - Verificar saúde da aplicação"
    echo "  cleanup    - Limpar logs antigos"
    echo "  help       - Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  $0 status"
    echo "  $0 restart"
    echo "  $0 ssl meudominio.com"
    echo "  $0 follow"
}

# Função principal
main() {
    check_user
    
    case "${1:-help}" in
        "status")
            show_status
            ;;
        "start")
            start_app
            ;;
        "stop")
            stop_app
            ;;
        "restart")
            restart_app
            ;;
        "logs")
            show_logs
            ;;
        "follow")
            follow_logs
            ;;
        "backup")
            backup_database
            ;;
        "update")
            update_app
            ;;
        "ssl")
            setup_ssl "$2"
            ;;
        "health")
            health_check
            ;;
        "cleanup")
            cleanup_logs
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Executar função principal
main "$@"
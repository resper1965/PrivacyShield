#!/bin/bash

# N.Crisis VPS Initialization Script
# Complete automated setup for Ubuntu 22.04 VPS
# Domain: monster.e-ness.com.br

set -euo pipefail

# Configuration
readonly DOMAIN="monster.e-ness.com.br"
readonly REPO_URL="https://github.com/resper1965/PrivacyShield.git"
readonly SCRIPTS_BASE_URL="https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts"
readonly APP_DIR="/opt/ncrisis"
readonly LOG_FILE="/var/log/ncrisis-init.log"

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "Este script deve ser executado como root (use sudo)"
    fi
}

# Welcome message
show_welcome() {
    clear
    echo -e "${BLUE}"
    echo "=========================================="
    echo "    N.CRISIS - VPS SETUP COMPLETO"
    echo "=========================================="
    echo -e "${NC}"
    echo "Domínio: $DOMAIN"
    echo "Repositório: $REPO_URL"
    echo ""
    echo "Este script irá:"
    echo "1. Atualizar sistema e instalar dependências"
    echo "2. Instalar e configurar Docker"
    echo "3. Configurar usuário e ambiente da aplicação"
    echo "4. Clonar repositório do N.Crisis"
    echo "5. Instalar e configurar aplicação"
    echo "6. Configurar SSL com Let's Encrypt"
    echo "7. Configurar monitoramento e backup"
    echo ""
    
    read -p "Continuar com a instalação? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Instalação cancelada."
        exit 0
    fi
}

# Get GitHub credentials
get_github_credentials() {
    echo ""
    log "INFO" "Configuração do GitHub necessária para clonar repositório privado"
    echo ""
    echo "Escolha o método de autenticação:"
    echo "1. Token de Acesso Pessoal (recomendado)"
    echo "2. Usuario e senha"
    echo ""
    
    read -p "Escolha (1 ou 2): " -n 1 -r auth_method
    echo ""
    
    case $auth_method in
        1)
            read -p "Digite seu token do GitHub: " -s github_token
            echo ""
            GITHUB_AUTH="https://$github_token@github.com/resper1965/PrivacyShield.git"
            ;;
        2)
            read -p "Digite seu usuário do GitHub: " github_user
            read -p "Digite sua senha do GitHub: " -s github_pass
            echo ""
            GITHUB_AUTH="https://$github_user:$github_pass@github.com/resper1965/PrivacyShield.git"
            ;;
        *)
            error_exit "Opção inválida"
            ;;
    esac
}

# Update system
update_system() {
    log "INFO" "Atualizando sistema..."
    
    apt update
    apt upgrade -y
    apt install -y curl wget git unzip software-properties-common
    
    log "INFO" "Sistema atualizado"
}

# Install Docker
install_docker() {
    log "INFO" "Instalando Docker..."
    
    # Remove old versions
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker repository
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    systemctl start docker
    systemctl enable docker
    
    log "INFO" "Docker instalado"
}

# Setup application user
setup_app_user() {
    log "INFO" "Configurando usuário da aplicação..."
    
    # Create user
    useradd -m -s /bin/bash ncrisis || true
    usermod -aG docker ncrisis
    
    # Create directories
    mkdir -p "$APP_DIR"
    chown ncrisis:ncrisis "$APP_DIR"
    
    log "INFO" "Usuário configurado"
}

# Clone repository
clone_repository() {
    log "INFO" "Clonando repositório..."
    
    sudo -u ncrisis git clone "$GITHUB_AUTH" "$APP_DIR"
    chown -R ncrisis:ncrisis "$APP_DIR"
    
    log "INFO" "Repositório clonado"
}

# Install application
install_application() {
    log "INFO" "Instalando aplicação N.Crisis..."
    
    cd "$APP_DIR"
    chmod +x scripts/*.sh
    
    # Run installation as ncrisis user
    sudo -u ncrisis ./scripts/install-production.sh
    
    log "INFO" "Aplicação instalada"
}

# Configure SSL
configure_ssl() {
    log "INFO" "Configurando SSL..."
    
    cd "$APP_DIR"
    ./scripts/ssl-setup.sh
    
    log "INFO" "SSL configurado"
}

# Configure monitoring
configure_monitoring() {
    log "INFO" "Configurando monitoramento..."
    
    # Setup health check cron
    (crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/ncrisis-health >> /var/log/ncrisis-health.log 2>&1") | crontab -
    
    # Setup backup cron for ncrisis user
    sudo -u ncrisis bash -c '(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/ncrisis-backup >> /var/log/ncrisis-backup.log 2>&1") | crontab -'
    
    log "INFO" "Monitoramento configurado"
}

# Configure firewall
configure_firewall() {
    log "INFO" "Configurando firewall..."
    
    ufw --force reset
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 8000/tcp
    ufw --force enable
    
    log "INFO" "Firewall configurado"
}

# Final verification
final_verification() {
    log "INFO" "Executando verificação final..."
    
    # Test HTTP
    if curl -f "http://localhost:8000/health" &> /dev/null; then
        log "INFO" "HTTP funcionando"
    else
        log "WARN" "HTTP pode não estar funcionando"
    fi
    
    # Test HTTPS if SSL was configured
    if curl -f "https://$DOMAIN/health" &> /dev/null; then
        log "INFO" "HTTPS funcionando"
    else
        log "WARN" "HTTPS pode não estar funcionando - verifique DNS"
    fi
    
    log "INFO" "Verificação concluída"
}

# Show final information
show_final_info() {
    local server_ip=$(curl -s ifconfig.me)
    
    echo ""
    echo "=========================================="
    echo "  INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
    echo "=========================================="
    echo ""
    echo "🌐 URLs de Acesso:"
    echo "   HTTPS: https://$DOMAIN"
    echo "   HTTP:  http://$server_ip:8000"
    echo ""
    echo "🔧 Informações do Sistema:"
    echo "   Servidor: $(hostname)"
    echo "   IP: $server_ip"
    echo "   Usuário: ncrisis"
    echo "   Diretório: $APP_DIR"
    echo ""
    echo "📊 Status dos Serviços:"
    docker ps --format "table {{.Names}}\t{{.Status}}"
    echo ""
    echo "🛠️ Comandos Úteis:"
    echo "   sudo su - ncrisis  # Trocar para usuário da aplicação"
    echo "   ncrisis-health     # Verificar saúde do sistema"
    echo "   ncrisis-backup     # Criar backup"
    echo "   ncrisis-update     # Atualizar aplicação"
    echo ""
    echo "📋 Logs Importantes:"
    echo "   Instalação: $LOG_FILE"
    echo "   Aplicação: $APP_DIR/logs/"
    echo "   Nginx: /var/log/nginx/"
    echo ""
    echo "🔐 Próximos Passos:"
    echo "   1. Teste o acesso via browser"
    echo "   2. Configure OpenAI API key se necessário"
    echo "   3. Configure SMTP para notificações"
    echo "   4. Revise configurações em $APP_DIR/.env.production"
    echo ""
    echo "🆘 Suporte:"
    echo "   Documentação: $APP_DIR/INSTALACAO_VPS.md"
    echo "   Troubleshooting: $APP_DIR/PASSO_A_PASSO_INSTALACAO.md"
    echo ""
    echo "=========================================="
    echo "  N.CRISIS ESTÁ PRONTO PARA USO!"
    echo "=========================================="
}

# Main function
main() {
    log "INFO" "Iniciando instalação completa do N.Crisis"
    
    # Create log file
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    check_root
    show_welcome
    get_github_credentials
    update_system
    install_docker
    setup_app_user
    clone_repository
    install_application
    configure_ssl
    configure_monitoring
    configure_firewall
    final_verification
    show_final_info
    
    log "INFO" "Instalação completa do N.Crisis concluída!"
}

# Error handling
trap 'error_exit "Instalação interrompida"' ERR
trap 'log "INFO" "Script de instalação finalizado"' EXIT

# Run main function
main "$@"
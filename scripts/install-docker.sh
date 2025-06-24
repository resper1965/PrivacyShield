#!/bin/bash

# Docker Installation Script for Ubuntu 22.04+
# N.Crisis Production Environment Setup

set -euo pipefail

# Configuration
readonly DOCKER_VERSION="24.0"
readonly COMPOSE_VERSION="2.20"
readonly LOG_FILE="/var/log/docker-install.log"

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

# Check system compatibility
check_system() {
    log "INFO" "Verificando compatibilidade do sistema..."
    
    if [[ ! -f /etc/os-release ]]; then
        error_exit "Sistema operacional não suportado"
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]] || [[ "${VERSION_ID%%.*}" -lt 22 ]]; then
        error_exit "Requer Ubuntu 22.04 ou superior"
    fi
    
    log "INFO" "Sistema compatível: $PRETTY_NAME"
}

# Update system packages
update_system() {
    log "INFO" "Atualizando pacotes do sistema..."
    
    apt update
    apt upgrade -y
    
    # Install prerequisites
    apt install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        software-properties-common \
        unzip \
        wget
    
    log "INFO" "Sistema atualizado com sucesso"
}

# Install Docker
install_docker() {
    log "INFO" "Instalando Docker..."
    
    # Remove old versions
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index
    apt update
    
    # Install Docker Engine
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    log "INFO" "Docker instalado com sucesso"
}

# Configure Docker
configure_docker() {
    log "INFO" "Configurando Docker..."
    
    # Create docker group if it doesn't exist
    groupadd docker 2>/dev/null || true
    
    # Configure Docker daemon
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "storage-opts": [
        "overlay2.override_kernel_check=true"
    ],
    "live-restore": true,
    "userland-proxy": false,
    "no-new-privileges": true
}
EOF
    
    # Restart Docker with new configuration
    systemctl daemon-reload
    systemctl restart docker
    
    log "INFO" "Docker configurado com sucesso"
}

# Create application user
create_app_user() {
    log "INFO" "Criando usuário da aplicação..."
    
    # Create ncrisis user if doesn't exist
    if ! id "ncrisis" &>/dev/null; then
        useradd -m -s /bin/bash ncrisis
        log "INFO" "Usuário 'ncrisis' criado"
    else
        log "INFO" "Usuário 'ncrisis' já existe"
    fi
    
    # Add user to docker group
    usermod -aG docker ncrisis
    
    # Create application directory
    mkdir -p /opt/ncrisis
    chown ncrisis:ncrisis /opt/ncrisis
    
    log "INFO" "Usuário configurado com sucesso"
}

# Configure firewall
configure_firewall() {
    log "INFO" "Configurando firewall..."
    
    # Install ufw if not present
    apt install -y ufw
    
    # Reset firewall
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH
    ufw allow ssh
    
    # Allow HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow application port
    ufw allow 8000/tcp
    
    # Enable firewall
    ufw --force enable
    
    log "INFO" "Firewall configurado com sucesso"
}

# Install additional tools
install_tools() {
    log "INFO" "Instalando ferramentas adicionais..."
    
    # Install monitoring tools
    apt install -y \
        htop \
        iotop \
        netstat-nat \
        tcpdump \
        strace \
        lsof \
        tree \
        jq \
        fail2ban \
        logrotate
    
    # Configure fail2ban
    systemctl enable fail2ban
    systemctl start fail2ban
    
    log "INFO" "Ferramentas instaladas com sucesso"
}

# Verify installation
verify_installation() {
    log "INFO" "Verificando instalação..."
    
    # Check Docker version
    local docker_version=$(docker --version | grep -oE '[0-9]+\.[0-9]+')
    log "INFO" "Docker versão: $docker_version"
    
    # Check Docker Compose version
    local compose_version=$(docker compose version --short)
    log "INFO" "Docker Compose versão: $compose_version"
    
    # Test Docker functionality
    if docker run --rm hello-world > /dev/null 2>&1; then
        log "INFO" "Docker está funcionando corretamente"
    else
        error_exit "Docker não está funcionando corretamente"
    fi
    
    # Check if ncrisis user can use docker
    if sudo -u ncrisis docker ps > /dev/null 2>&1; then
        log "INFO" "Usuário ncrisis pode usar Docker"
    else
        log "WARN" "Usuário ncrisis pode precisar fazer logout/login para usar Docker"
    fi
    
    log "INFO" "Verificação concluída com sucesso"
}

# Display final information
show_final_info() {
    echo ""
    echo "=========================================="
    echo "  DOCKER INSTALADO COM SUCESSO"
    echo "=========================================="
    echo ""
    echo "🐳 Docker Engine: $(docker --version)"
    echo "🔧 Docker Compose: $(docker compose version --short)"
    echo ""
    echo "👤 Usuário da aplicação: ncrisis"
    echo "📁 Diretório da aplicação: /opt/ncrisis"
    echo ""
    echo "🔥 Firewall configurado:"
    echo "   - SSH (22/tcp)"
    echo "   - HTTP (80/tcp)"
    echo "   - HTTPS (443/tcp)"
    echo "   - Aplicação (8000/tcp)"
    echo ""
    echo "📋 Próximos passos:"
    echo "   1. Faça login como usuário ncrisis:"
    echo "      sudo su - ncrisis"
    echo ""
    echo "   2. Clone o repositório:"
    echo "      cd /opt/ncrisis"
    echo "      git clone https://github.com/resper1965/PrivacyShield.git ."
    echo ""
    echo "   3. Execute a instalação da aplicação:"
    echo "      ./scripts/install-production.sh"
    echo ""
    echo "=========================================="
}

# Main installation function
main() {
    log "INFO" "Iniciando instalação do Docker..."
    
    # Create log file
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    check_root
    check_system
    update_system
    install_docker
    configure_docker
    create_app_user
    configure_firewall
    install_tools
    verify_installation
    show_final_info
    
    log "INFO" "Instalação do Docker concluída com sucesso!"
}

# Error handling
trap 'error_exit "Script interrompido unexpectedly"' ERR
trap 'log "INFO" "Script de instalação do Docker finalizado"' EXIT

# Run main function
main "$@"
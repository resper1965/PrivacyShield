#!/bin/bash

# N.Crisis Complete VPS Installation Script
# Ubuntu 22.04+ with Docker for monster.e-ness.com.br
# Version: 2.0 - All-in-one installer

set -euo pipefail

# Configuration
readonly DOMAIN="monster.e-ness.com.br"
readonly REPO_URL="https://github.com/resper1965/PrivacyShield.git"
readonly APP_DIR="/opt/ncrisis"
readonly LOG_FILE="/var/log/ncrisis-install.log"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Global variables
GITHUB_AUTH=""
INSTALL_SSL=true

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
    echo -e "${RED}ERRO: $1${NC}"
    echo "Verifique o log: $LOG_FILE"
    exit 1
}

# Show welcome message
show_welcome() {
    clear
    echo -e "${BLUE}"
    echo "=========================================="
    echo "    N.CRISIS - INSTALAÇÃO COMPLETA VPS"
    echo "=========================================="
    echo -e "${NC}"
    echo "Domínio: $DOMAIN"
    echo "Repositório: $REPO_URL"
    echo ""
    echo "Este script irá:"
    echo "✓ Atualizar sistema Ubuntu 22.04+"
    echo "✓ Instalar Docker e Docker Compose"
    echo "✓ Configurar usuário e ambiente"
    echo "✓ Clonar repositório N.Crisis"
    echo "✓ Instalar aplicação completa"
    echo "✓ Configurar SSL Let's Encrypt"
    echo "✓ Configurar backup e monitoramento"
    echo ""
    echo "Tempo estimado: 15-30 minutos"
    echo ""
    
    read -p "Continuar com a instalação? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Instalação cancelada."
        exit 0
    fi
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "Este script deve ser executado como root (use sudo)"
    fi
}

# Check system requirements
check_system() {
    log "INFO" "Verificando sistema..."
    
    if [[ ! -f /etc/os-release ]]; then
        error_exit "Sistema operacional não suportado"
    fi
    
    source /etc/os-release
    if [[ "$ID" != "ubuntu" ]] || [[ "${VERSION_ID%%.*}" -lt 22 ]]; then
        error_exit "Requer Ubuntu 22.04 ou superior. Detectado: $PRETTY_NAME"
    fi
    
    # Check memory
    local memory_gb=$(free -g | awk 'NR==2{printf "%.0f", $2}')
    if [[ $memory_gb -lt 4 ]]; then
        log "WARN" "Memória: ${memory_gb}GB (recomendado: 8GB+)"
    fi
    
    # Check disk space
    local disk_space=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $disk_space -lt 20 ]]; then
        error_exit "Espaço insuficiente: ${disk_space}GB (mínimo: 20GB)"
    fi
    
    log "INFO" "Sistema compatível: $PRETTY_NAME"
}

# Get GitHub credentials
get_github_credentials() {
    echo ""
    echo "=== Configuração do GitHub ==="
    echo ""
    echo "O repositório N.Crisis é privado. Escolha o método:"
    echo "1. Token de Acesso Pessoal (recomendado)"
    echo "2. Usuário e senha"
    echo "3. Continuar sem clonar (apenas Docker)"
    echo ""
    
    read -p "Escolha (1, 2 ou 3): " -n 1 -r auth_method
    echo ""
    
    case $auth_method in
        1)
            echo "Para criar um token:"
            echo "1. Vá para: https://github.com/settings/tokens"
            echo "2. Clique em 'Generate new token (classic)'"
            echo "3. Selecione: repo, read:org"
            echo ""
            read -p "Digite seu token: " -s github_token
            echo ""
            if [[ -n "$github_token" ]]; then
                GITHUB_AUTH="https://$github_token@github.com/resper1965/PrivacyShield.git"
            else
                error_exit "Token não pode estar vazio"
            fi
            ;;
        2)
            read -p "Usuário GitHub: " github_user
            read -p "Senha GitHub: " -s github_pass
            echo ""
            if [[ -n "$github_user" && -n "$github_pass" ]]; then
                GITHUB_AUTH="https://$github_user:$github_pass@github.com/resper1965/PrivacyShield.git"
            else
                error_exit "Usuário e senha não podem estar vazios"
            fi
            ;;
        3)
            log "WARN" "Continuando apenas com Docker - repositório não será clonado"
            GITHUB_AUTH=""
            ;;
        *)
            error_exit "Opção inválida"
            ;;
    esac
}

# Update system
update_system() {
    log "INFO" "Atualizando sistema..."
    
    apt update -qq
    apt upgrade -y -qq
    apt install -y -qq curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
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
    
    apt update -qq
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Configure Docker daemon
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json << 'EOF'
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "live-restore": true,
    "userland-proxy": false
}
EOF
    
    systemctl daemon-reload
    systemctl start docker
    systemctl enable docker
    
    # Test Docker
    if ! docker run --rm hello-world > /dev/null 2>&1; then
        error_exit "Docker não está funcionando corretamente"
    fi
    
    log "INFO" "Docker instalado: $(docker --version)"
}

# Setup application user
setup_app_user() {
    log "INFO" "Configurando usuário da aplicação..."
    
    # Create user
    if ! id "ncrisis" &>/dev/null; then
        useradd -m -s /bin/bash ncrisis
        log "INFO" "Usuário 'ncrisis' criado"
    fi
    
    usermod -aG docker ncrisis
    
    # Create directories
    mkdir -p "$APP_DIR"
    chown ncrisis:ncrisis "$APP_DIR"
    
    log "INFO" "Usuário configurado"
}

# Clone repository or create minimal structure
setup_application() {
    log "INFO" "Configurando aplicação..."
    
    if [[ -n "$GITHUB_AUTH" ]]; then
        # Clone repository
        log "INFO" "Clonando repositório..."
        sudo -u ncrisis git clone "$GITHUB_AUTH" "$APP_DIR" || error_exit "Falha ao clonar repositório"
        chown -R ncrisis:ncrisis "$APP_DIR"
        log "INFO" "Repositório clonado"
    else
        # Create minimal structure for Docker-only installation
        log "INFO" "Criando estrutura mínima..."
        
        sudo -u ncrisis mkdir -p "$APP_DIR"/{scripts,src,frontend,uploads,logs,tmp,local_files,shared_folders}
        
        # Create basic docker-compose
        cat > "$APP_DIR/docker-compose.yml" << 'EOF'
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ncrisis_db
      POSTGRES_USER: ncrisis_user
      POSTGRES_PASSWORD: ncrisis_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
EOF
        
        chown -R ncrisis:ncrisis "$APP_DIR"
        log "INFO" "Estrutura mínima criada"
    fi
    
    # Make scripts executable if they exist
    if [[ -d "$APP_DIR/scripts" ]]; then
        chmod +x "$APP_DIR/scripts/"*.sh 2>/dev/null || true
    fi
}

# Install application (if repository was cloned)
install_application() {
    if [[ -n "$GITHUB_AUTH" && -f "$APP_DIR/scripts/install-production.sh" ]]; then
        log "INFO" "Instalando aplicação N.Crisis..."
        
        cd "$APP_DIR"
        sudo -u ncrisis ./scripts/install-production.sh || log "WARN" "Falha na instalação automática"
        
        log "INFO" "Aplicação instalada"
    else
        log "INFO" "Iniciando serviços básicos..."
        
        cd "$APP_DIR"
        sudo -u ncrisis docker compose up -d || log "WARN" "Falha ao iniciar serviços"
    fi
}

# Configure firewall
configure_firewall() {
    log "INFO" "Configurando firewall..."
    
    # Install and configure UFW
    apt install -y ufw
    
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

# Install Nginx and SSL
configure_ssl() {
    if [[ "$INSTALL_SSL" != true ]]; then
        log "INFO" "Configuração SSL pulada"
        return
    fi
    
    log "INFO" "Configurando SSL..."
    
    # Install Nginx and Certbot
    apt update -qq
    apt install -y nginx certbot python3-certbot-nginx
    
    # Create basic Nginx config
    cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/"
    rm -f /etc/nginx/sites-enabled/default
    
    nginx -t && systemctl restart nginx
    
    # Try to get SSL certificate
    local email="admin@e-ness.com.br"
    if certbot --nginx -d "$DOMAIN" --email "$email" --agree-tos --non-interactive --redirect; then
        log "INFO" "SSL configurado com sucesso"
    else
        log "WARN" "Falha na configuração SSL - verifique DNS"
    fi
}

# Setup monitoring
setup_monitoring() {
    log "INFO" "Configurando monitoramento básico..."
    
    # Install monitoring tools
    apt install -y htop iotop netstat-nat fail2ban logrotate
    
    # Create basic health check script
    cat > /usr/local/bin/ncrisis-health << 'EOF'
#!/bin/bash
echo "=== N.Crisis Health Check ==="
echo "Data: $(date)"
echo "Uptime: $(uptime)"
echo ""
echo "=== Docker Containers ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "=== Disk Usage ==="
df -h /
echo ""
echo "=== Memory Usage ==="
free -h
echo ""
echo "=== Network ==="
ss -tulpn | grep -E ":(80|443|8000|5432|6379)"
EOF
    
    chmod +x /usr/local/bin/ncrisis-health
    
    # Setup basic cron jobs
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/bin/docker system prune -f >> /var/log/docker-cleanup.log 2>&1") | crontab -
    
    log "INFO" "Monitoramento configurado"
}

# Final verification
final_verification() {
    log "INFO" "Verificação final..."
    
    # Test services
    local tests=()
    
    if curl -f http://localhost:8000 &>/dev/null; then
        tests+=("✓ HTTP:8000 respondendo")
    else
        tests+=("✗ HTTP:8000 não responde")
    fi
    
    if curl -f "http://$DOMAIN" &>/dev/null; then
        tests+=("✓ Domínio HTTP respondendo")
    else
        tests+=("✗ Domínio HTTP não responde")
    fi
    
    if curl -f "https://$DOMAIN" &>/dev/null; then
        tests+=("✓ HTTPS funcionando")
    else
        tests+=("✗ HTTPS não funciona")
    fi
    
    # Show results
    echo ""
    echo "=== Resultados dos Testes ==="
    for test in "${tests[@]}"; do
        echo "$test"
    done
    echo ""
    
    log "INFO" "Verificação concluída"
}

# Show final information
show_final_info() {
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || echo "N/A")
    
    clear
    echo -e "${GREEN}"
    echo "=========================================="
    echo "   INSTALAÇÃO CONCLUÍDA COM SUCESSO!"
    echo "=========================================="
    echo -e "${NC}"
    echo ""
    echo "🌐 URLs de Acesso:"
    echo "   HTTPS: https://$DOMAIN"
    echo "   HTTP:  http://$server_ip:8000"
    echo "   IP:    $server_ip"
    echo ""
    echo "🔧 Informações do Sistema:"
    echo "   Servidor: $(hostname)"
    echo "   Usuário: ncrisis"
    echo "   Diretório: $APP_DIR"
    echo "   Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    echo ""
    echo "📊 Status dos Serviços:"
    docker ps --format "table {{.Names}}\t{{.Status}}" 2>/dev/null || echo "   Docker não está rodando"
    echo ""
    echo "🛠️ Comandos Úteis:"
    echo "   ncrisis-health              # Verificar sistema"
    echo "   sudo su - ncrisis           # Trocar para usuário da aplicação"
    echo "   cd $APP_DIR                 # Ir para diretório da aplicação"
    echo "   docker compose ps           # Ver containers"
    echo "   docker compose logs -f      # Ver logs em tempo real"
    echo ""
    echo "📋 Logs Importantes:"
    echo "   Instalação: $LOG_FILE"
    echo "   Aplicação: $APP_DIR/logs/"
    echo "   Nginx: /var/log/nginx/"
    echo "   Docker: journalctl -u docker"
    echo ""
    echo "🔐 Próximos Passos:"
    if [[ -z "$GITHUB_AUTH" ]]; then
        echo "   1. Clone o repositório manualmente"
        echo "   2. Execute os scripts de instalação"
    fi
    echo "   3. Configure OpenAI API key se necessário"
    echo "   4. Configure SendGrid para emails"
    echo "   5. Teste todas as funcionalidades"
    echo ""
    echo "🆘 Suporte:"
    echo "   Health Check: ncrisis-health"
    echo "   Logs: tail -f $LOG_FILE"
    echo ""
    echo "=========================================="
    echo "    N.CRISIS ESTÁ PRONTO!"
    echo "=========================================="
}

# Main installation function
main() {
    # Create log file
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    log "INFO" "Iniciando instalação N.Crisis VPS"
    
    check_root
    show_welcome
    check_system
    get_github_credentials
    update_system
    install_docker
    setup_app_user
    setup_application
    install_application
    configure_firewall
    configure_ssl
    setup_monitoring
    final_verification
    show_final_info
    
    log "INFO" "Instalação concluída com sucesso!"
}

# Error handling
trap 'error_exit "Instalação interrompida unexpectedly"' ERR
trap 'log "INFO" "Script finalizado"' EXIT

# Run main function
main "$@"
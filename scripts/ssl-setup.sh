#!/bin/bash

# SSL Certificate Setup for N.Crisis
# Domain: monster.e-ness.com.br

set -euo pipefail

# Configuration
readonly DOMAIN="monster.e-ness.com.br"
readonly EMAIL="admin@e-ness.com.br"
readonly WEBROOT="/var/www/html"
readonly LOG_FILE="/var/log/ssl-setup.log"

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

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error_exit "Este script deve ser executado como root (use sudo)"
    fi
}

# Install required packages
install_packages() {
    log "INFO" "Instalando pacotes necessários..."
    
    apt update
    apt install -y nginx certbot python3-certbot-nginx
    
    log "INFO" "Pacotes instalados com sucesso"
}

# Configure Nginx
configure_nginx() {
    log "INFO" "Configurando Nginx..."
    
    # Create webroot directory
    mkdir -p "$WEBROOT"
    chown www-data:www-data "$WEBROOT"
    
    # Create initial Nginx configuration for domain verification
    cat > "/etc/nginx/sites-available/$DOMAIN" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    
    root $WEBROOT;
    index index.html;
    
    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root $WEBROOT;
    }
    
    # Health check for domain verification
    location /health {
        return 200 'Domain verification OK';
        add_header Content-Type text/plain;
    }
    
    # Temporary response for other requests
    location / {
        return 200 'N.Crisis - SSL Setup in Progress';
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Enable site
    ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/"
    
    # Remove default site if exists
    rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    nginx -t
    
    # Start/restart Nginx
    systemctl enable nginx
    systemctl restart nginx
    
    log "INFO" "Nginx configurado com sucesso"
}

# Verify DNS resolution
verify_dns() {
    log "INFO" "Verificando resolução DNS para $DOMAIN..."
    
    local server_ip=$(curl -s ifconfig.me)
    local domain_ip=$(dig +short "$DOMAIN" | tail -1)
    
    if [[ "$server_ip" != "$domain_ip" ]]; then
        log "WARN" "DNS pode não estar apontando corretamente:"
        log "WARN" "IP do servidor: $server_ip"
        log "WARN" "IP do domínio: $domain_ip"
        log "WARN" "Aguarde a propagação DNS antes de continuar"
        
        read -p "Continuar mesmo assim? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log "INFO" "DNS está configurado corretamente"
    fi
}

# Test domain accessibility
test_domain() {
    log "INFO" "Testando acessibilidade do domínio..."
    
    local max_attempts=5
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f "http://$DOMAIN/health" &> /dev/null; then
            log "INFO" "Domínio está acessível"
            break
        fi
        
        if [[ $attempt -eq $max_attempts ]]; then
            error_exit "Domínio não está acessível via HTTP"
        fi
        
        log "INFO" "Tentativa $attempt/$max_attempts - aguardando..."
        sleep 10
        ((attempt++))
    done
}

# Obtain SSL certificate
obtain_certificate() {
    log "INFO" "Obtendo certificado SSL para $DOMAIN..."
    
    # Use webroot method for certificate
    certbot certonly \
        --webroot \
        --webroot-path="$WEBROOT" \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        --domains "$DOMAIN" \
        --non-interactive
    
    if [[ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]]; then
        error_exit "Falha ao obter certificado SSL"
    fi
    
    log "INFO" "Certificado SSL obtido com sucesso"
}

# Configure Nginx with SSL
configure_ssl_nginx() {
    log "INFO" "Configurando Nginx com SSL..."
    
    # Copy the production nginx configuration
    cp "/opt/ncrisis/scripts/nginx-config.conf" "/etc/nginx/sites-available/$DOMAIN"
    
    # Test configuration
    nginx -t
    
    # Reload Nginx
    systemctl reload nginx
    
    log "INFO" "Nginx configurado com SSL"
}

# Setup certificate auto-renewal
setup_auto_renewal() {
    log "INFO" "Configurando renovação automática do certificado..."
    
    # Create renewal script
    cat > "/usr/local/bin/renew-ssl" << 'EOF'
#!/bin/bash
certbot renew --quiet --post-hook "systemctl reload nginx"
EOF
    
    chmod +x "/usr/local/bin/renew-ssl"
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/local/bin/renew-ssl >> /var/log/ssl-renewal.log 2>&1") | crontab -
    
    # Test renewal
    certbot renew --dry-run
    
    log "INFO" "Renovação automática configurada"
}

# Verify SSL configuration
verify_ssl() {
    log "INFO" "Verificando configuração SSL..."
    
    # Test HTTPS access
    if curl -f "https://$DOMAIN/health" &> /dev/null; then
        log "INFO" "HTTPS está funcionando corretamente"
    else
        error_exit "HTTPS não está funcionando"
    fi
    
    # Check SSL grade (optional)
    if command -v openssl &> /dev/null; then
        local ssl_info=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates)
        log "INFO" "Informações do certificado SSL:"
        log "INFO" "$ssl_info"
    fi
}

# Configure firewall
configure_firewall() {
    log "INFO" "Configurando firewall para HTTPS..."
    
    ufw allow 'Nginx Full'
    ufw --force enable
    
    log "INFO" "Firewall configurado"
}

# Display final information
show_final_info() {
    local cert_expiry=$(openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
    
    echo ""
    echo "=========================================="
    echo "  SSL CONFIGURADO COM SUCESSO"
    echo "=========================================="
    echo ""
    echo "🔒 Domínio: https://$DOMAIN"
    echo "📧 Email: $EMAIL"
    echo "📅 Certificado válido até: $cert_expiry"
    echo ""
    echo "🔧 Configurações:"
    echo "   - Nginx: /etc/nginx/sites-available/$DOMAIN"
    echo "   - Certificado: /etc/letsencrypt/live/$DOMAIN/"
    echo "   - Log: $LOG_FILE"
    echo ""
    echo "🔄 Renovação automática:"
    echo "   - Script: /usr/local/bin/renew-ssl"
    echo "   - Cron: Todos os dias às 12:00"
    echo ""
    echo "✅ Próximos passos:"
    echo "   1. Teste o acesso: https://$DOMAIN"
    echo "   2. Configure o N.Crisis para usar HTTPS"
    echo "   3. Atualize DNS se necessário"
    echo ""
    echo "🛡️ Verificação de segurança:"
    echo "   https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN"
    echo ""
    echo "=========================================="
}

# Main function
main() {
    log "INFO" "Iniciando configuração SSL para $DOMAIN"
    
    # Create log file
    touch "$LOG_FILE"
    chmod 644 "$LOG_FILE"
    
    check_root
    install_packages
    configure_nginx
    verify_dns
    test_domain
    obtain_certificate
    configure_ssl_nginx
    setup_auto_renewal
    verify_ssl
    configure_firewall
    show_final_info
    
    log "INFO" "Configuração SSL concluída com sucesso!"
}

# Error handling
trap 'error_exit "Script interrompido unexpectedly"' ERR
trap 'log "INFO" "Script de configuração SSL finalizado"' EXIT

# Run main function
main "$@"
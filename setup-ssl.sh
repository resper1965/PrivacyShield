#!/bin/bash

# Configuração SSL automática para N.Crisis
# Execute: sudo bash setup-ssl.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash setup-ssl.sh"
    exit 1
fi

echo "=== CONFIGURAÇÃO SSL N.CRISIS ==="

DOMAIN="monster.e-ness.com.br"

# Verificar se Certbot está instalado
if ! command -v certbot >/dev/null 2>&1; then
    echo "Instalando Certbot..."
    apt update
    apt install -y certbot python3-certbot-nginx
fi

# Verificar se aplicação está funcionando
echo "Verificando aplicação..."
if ! curl -sf http://localhost:5000/health >/dev/null 2>&1; then
    echo "❌ Aplicação não responde na porta 5000"
    exit 1
fi

if ! curl -sf http://${DOMAIN}/health >/dev/null 2>&1; then
    echo "❌ Acesso HTTP não funciona"
    exit 1
fi

echo "✅ Aplicação funcionando, configurando SSL..."

# Obter certificado SSL
echo "Obtendo certificado SSL para ${DOMAIN}..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@e-ness.com.br --no-eff-email

# Verificar se SSL foi configurado
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "✅ Certificado SSL obtido com sucesso"
    
    # Testar HTTPS
    sleep 5
    if curl -sf https://${DOMAIN}/health >/dev/null 2>&1; then
        echo "✅ HTTPS funcionando!"
    else
        echo "⚠️ HTTPS configurado mas não responde ainda"
        echo "Aguarde alguns minutos e teste: https://${DOMAIN}"
    fi
else
    echo "❌ Falha ao obter certificado SSL"
    echo "Possíveis causas:"
    echo "- DNS não aponta para este servidor"
    echo "- Firewall bloqueando porta 80/443"
    echo "- Domínio não resolve corretamente"
fi

# Configurar renovação automática
echo "Configurando renovação automática..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo
echo "=== CONFIGURAÇÃO SSL CONCLUÍDA ==="
echo "URLs de acesso:"
echo "  HTTP:  http://${DOMAIN}"
echo "  HTTPS: https://${DOMAIN}"
echo
echo "Renovação automática configurada para executar diariamente às 12h"
echo "Teste manual: certbot renew --dry-run"
#!/bin/bash

# Diagnóstico completo da porta 80
echo "=== DIAGNÓSTICO PORTA 80 ==="

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash check-port-80.sh"
    exit 1
fi

echo "1. Verificando quem está usando a porta 80..."
netstat -tlnp | grep ":80 " || ss -tlnp | grep ":80 "
echo

echo "2. Processos que podem usar porta 80..."
ps aux | grep -E "(nginx|apache|httpd|lighttpd)" | grep -v grep
echo

echo "3. Serviços ativos que podem conflitar..."
systemctl list-units --state=active | grep -E "(nginx|apache|httpd|lighttpd)"
echo

echo "4. Verificando se Apache está instalado e ativo..."
if command -v apache2 >/dev/null 2>&1; then
    echo "Apache2 instalado: $(apache2 -v | head -1)"
    echo "Status: $(systemctl is-active apache2 2>/dev/null || echo 'inativo')"
else
    echo "Apache2 não encontrado"
fi

if command -v httpd >/dev/null 2>&1; then
    echo "HTTPD instalado"
    echo "Status: $(systemctl is-active httpd 2>/dev/null || echo 'inativo')"
else
    echo "HTTPD não encontrado"
fi
echo

echo "5. Status do Nginx..."
if command -v nginx >/dev/null 2>&1; then
    echo "Nginx instalado: $(nginx -v 2>&1)"
    echo "Status: $(systemctl is-active nginx 2>/dev/null || echo 'inativo')"
    echo "Configuração:"
    nginx -T 2>/dev/null | grep -A5 -B5 "listen.*80" || echo "Nenhuma configuração listen 80 encontrada"
else
    echo "Nginx não instalado"
fi
echo

echo "6. Verificando configurações de site..."
if [ -d "/etc/nginx/sites-enabled" ]; then
    echo "Sites habilitados no Nginx:"
    ls -la /etc/nginx/sites-enabled/
    echo
    for site in /etc/nginx/sites-enabled/*; do
        if [ -f "$site" ]; then
            echo "=== $(basename $site) ==="
            grep -n "listen" "$site" || echo "Sem configuração listen"
            echo
        fi
    done
fi

echo "7. Testando bind na porta 80..."
if python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
try:
    s.bind(('0.0.0.0', 80))
    s.close()
    print('✅ Porta 80 disponível')
except Exception as e:
    print(f'❌ Porta 80 ocupada: {e}')
" 2>/dev/null; then
    echo "Teste de bind executado"
else
    echo "Erro no teste de bind"
fi
echo

echo "8. Firewall e iptables..."
if command -v ufw >/dev/null 2>&1; then
    echo "UFW status:"
    ufw status
else
    echo "UFW não instalado"
fi

echo "Regras iptables relevantes:"
iptables -L INPUT -n | grep -E "(80|http)" || echo "Nenhuma regra específica para porta 80"
echo

echo "=== SOLUÇÕES SUGERIDAS ==="
if netstat -tlnp 2>/dev/null | grep -q ":80 " || ss -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "❌ PORTA 80 OCUPADA"
    echo
    echo "Soluções:"
    echo "1. Parar Apache (se ativo):"
    echo "   systemctl stop apache2"
    echo "   systemctl disable apache2"
    echo
    echo "2. Usar porta alternativa para N.Crisis:"
    echo "   Editar /etc/nginx/sites-available/ncrisis"
    echo "   Trocar 'listen 80' por 'listen 8080'"
    echo
    echo "3. Forçar liberação da porta 80:"
    echo "   fuser -k 80/tcp"
    echo "   systemctl restart nginx"
else
    echo "✅ PORTA 80 LIVRE"
    echo
    echo "Pode ser problema de configuração do Nginx."
    echo "Execute o fix-urgente.sh novamente."
fi
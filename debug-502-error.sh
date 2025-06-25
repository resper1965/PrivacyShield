#!/bin/bash

# Debug erro 502 na VPS
# Execute na VPS: sudo bash debug-502-error.sh

if [ "$EUID" -ne 0 ]; then
    echo "Execute como root: sudo bash debug-502-error.sh"
    exit 1
fi

echo "=== DEBUG ERRO 502 ==="

INSTALL_DIR="/opt/ncrisis"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "❌ Diretório $INSTALL_DIR não encontrado"
    exit 1
fi

cd "$INSTALL_DIR"

echo "1. Status dos containers..."
docker compose ps

echo
echo "2. Logs da aplicação (últimas 50 linhas)..."
docker compose logs --tail=50 app

echo
echo "3. Logs do PostgreSQL (últimas 20 linhas)..."
docker compose logs --tail=20 postgres

echo
echo "4. Logs do Redis (últimas 10 linhas)..."
docker compose logs --tail=10 redis

echo
echo "5. Verificando conectividade interna..."
echo "App health interno:"
docker compose exec -T app curl -sf http://localhost:5000/health 2>/dev/null || echo "FALHOU"

echo "PostgreSQL interno:"
docker compose exec -T postgres pg_isready -U ncrisis_user -d ncrisis_db 2>/dev/null || echo "FALHOU"

echo "Redis interno:"
docker compose exec -T redis redis-cli ping 2>/dev/null || echo "FALHOU"

echo
echo "6. Verificando portas do host..."
echo "Porta 5000:"
netstat -tlnp | grep :5000 || echo "Não está escutando"

echo "Curl direto no host:"
curl -sf http://localhost:5000/health 2>/dev/null || echo "FALHOU"

echo
echo "7. Status do Nginx..."
systemctl status nginx --no-pager -l

echo
echo "8. Configuração do Nginx..."
nginx -t

echo
echo "9. Logs do Nginx (últimas 20 linhas)..."
tail -20 /var/log/nginx/error.log 2>/dev/null || echo "Log não encontrado"

echo
echo "10. Teste de conectividade externa..."
echo "Health check externo:"
curl -I http://monster.e-ness.com.br/health 2>/dev/null || echo "FALHOU"

echo
echo "11. Verificando processo da aplicação..."
docker compose exec -T app ps aux | grep node || echo "Processo node não encontrado"

echo
echo "12. Verificando variáveis de ambiente..."
docker compose exec -T app env | grep -E "NODE_ENV|PORT|DATABASE_URL" || echo "Variáveis não encontradas"

echo
echo "=== DIAGNÓSTICO COMPLETO ==="
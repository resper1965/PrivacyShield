#!/bin/bash

echo "=== DIAGNÓSTICO N.CRISIS VPS ==="
echo "Data: $(date)"
echo

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Execute como root: sudo bash debug-vps.sh"
    exit 1
fi

# 1. Sistema básico
echo "1. SISTEMA:"
echo "   OS: $(lsb_release -d 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME)"
echo "   Uptime: $(uptime -p)"
echo "   Disk: $(df -h / | tail -1 | awk '{print $4}') livre"
echo

# 2. Node.js
echo "2. NODE.JS:"
if command -v node >/dev/null 2>&1; then
    echo "   ✓ Node: $(node --version)"
else
    echo "   ✗ Node não instalado"
fi

if command -v npm >/dev/null 2>&1; then
    echo "   ✓ NPM: $(npm --version)"
else
    echo "   ✗ NPM não instalado"
fi
echo

# 3. Docker
echo "3. DOCKER:"
if command -v docker >/dev/null 2>&1; then
    echo "   ✓ Docker: $(docker --version)"
    echo "   Status: $(systemctl is-active docker)"
else
    echo "   ✗ Docker não instalado"
fi

if docker compose version >/dev/null 2>&1; then
    echo "   ✓ Docker Compose plugin instalado"
else
    echo "   ✗ Docker Compose plugin não encontrado"
fi
echo

# 4. Diretório da aplicação
echo "4. APLICAÇÃO:"
if [ -d "/opt/ncrisis" ]; then
    echo "   ✓ Diretório /opt/ncrisis existe"
    cd /opt/ncrisis
    
    if [ -f "docker-compose.yml" ]; then
        echo "   ✓ docker-compose.yml encontrado"
    else
        echo "   ✗ docker-compose.yml não encontrado"
    fi
    
    if [ -f ".env" ]; then
        echo "   ✓ .env encontrado"
    else
        echo "   ✗ .env não encontrado"
    fi
    
    if [ -f "Dockerfile" ]; then
        echo "   ✓ Dockerfile encontrado"
    else
        echo "   ✗ Dockerfile não encontrado"
    fi
else
    echo "   ✗ Diretório /opt/ncrisis não existe"
fi
echo

# 5. Containers Docker
echo "5. CONTAINERS:"
if command -v docker >/dev/null 2>&1 && [ -d "/opt/ncrisis" ]; then
    cd /opt/ncrisis
    echo "   Status dos containers:"
    docker compose ps 2>/dev/null || echo "   ✗ Erro ao verificar containers"
    echo
    
    echo "   Containers em execução:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "   ✗ Erro ao listar containers"
    echo
fi

# 6. Nginx
echo "6. NGINX:"
if command -v nginx >/dev/null 2>&1; then
    echo "   ✓ Nginx instalado: $(nginx -v 2>&1)"
    echo "   Status: $(systemctl is-active nginx 2>/dev/null || echo 'inativo')"
    
    if nginx -t 2>/dev/null; then
        echo "   ✓ Configuração válida"
    else
        echo "   ✗ Erro na configuração:"
        nginx -t 2>&1 | tail -3
    fi
    
    if [ -f "/etc/nginx/sites-enabled/ncrisis" ]; then
        echo "   ✓ Site ncrisis habilitado"
    else
        echo "   ✗ Site ncrisis não habilitado"
    fi
else
    echo "   ✗ Nginx não instalado"
fi
echo

# 7. Portas
echo "7. PORTAS:"
echo "   Portas em uso:"
ss -tlnp | grep ":80\|:443\|:5000" 2>/dev/null || echo "   Nenhuma porta web aberta"
echo

# 8. Firewall
echo "8. FIREWALL:"
if command -v ufw >/dev/null 2>&1; then
    echo "   UFW status:"
    ufw status 2>/dev/null || echo "   UFW desabilitado"
else
    echo "   UFW não instalado"
fi
echo

# 9. DNS e conectividade
echo "9. CONECTIVIDADE:"
echo "   Teste de internet:"
if curl -s --max-time 5 https://google.com >/dev/null 2>&1; then
    echo "   ✓ Internet funcionando"
else
    echo "   ✗ Sem internet"
fi

echo "   DNS monster.e-ness.com.br:"
nslookup monster.e-ness.com.br 8.8.8.8 2>/dev/null | grep -A 2 "Name:" || echo "   ✗ DNS não resolve"
echo

# 10. Testes de acesso
echo "10. TESTES DE ACESSO:"
if [ -d "/opt/ncrisis" ]; then
    cd /opt/ncrisis
    
    echo "    Aplicação local (porta 5000):"
    if curl -s --max-time 10 http://localhost:5000/health >/dev/null 2>&1; then
        echo "    ✓ App local respondendo"
        curl -s http://localhost:5000/health | jq -r '.status' 2>/dev/null || echo "    Resposta sem JSON"
    else
        echo "    ✗ App local não responde"
    fi
    
    echo "    Proxy Nginx (porta 80):"
    if curl -s --max-time 10 http://localhost/health >/dev/null 2>&1; then
        echo "    ✓ Proxy funcionando"
    else
        echo "    ✗ Proxy não responde"
    fi
    
    echo "    Acesso externo HTTP:"
    if curl -s --max-time 10 http://monster.e-ness.com.br/health >/dev/null 2>&1; then
        echo "    ✓ HTTP externo funcionando"
    else
        echo "    ✗ HTTP externo falhou"
    fi
    
    echo "    Acesso externo HTTPS:"
    if curl -s --max-time 10 https://monster.e-ness.com.br/health >/dev/null 2>&1; then
        echo "    ✓ HTTPS externo funcionando"
    else
        echo "    ✗ HTTPS externo falhou"
    fi
fi
echo

# 11. Logs mais recentes
echo "11. LOGS RECENTES:"
if [ -d "/opt/ncrisis" ]; then
    cd /opt/ncrisis
    echo "    Docker logs (últimas 10 linhas):"
    docker compose logs --tail=10 2>/dev/null || echo "    ✗ Sem logs Docker"
    echo
fi

if [ -f "/var/log/nginx/error.log" ]; then
    echo "    Nginx error log (últimas 5 linhas):"
    tail -5 /var/log/nginx/error.log 2>/dev/null || echo "    ✗ Sem logs Nginx"
else
    echo "    ✗ Log do Nginx não encontrado"
fi
echo

# 12. Resumo e próximos passos
echo "12. RESUMO:"
echo "=================="

if [ ! -d "/opt/ncrisis" ]; then
    echo "❌ PROBLEMA: Aplicação não foi instalada"
    echo "SOLUÇÃO: Execute o script de instalação:"
    echo "curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/install-vps-simples.sh | sudo bash"
elif ! command -v docker >/dev/null 2>&1; then
    echo "❌ PROBLEMA: Docker não instalado"
    echo "SOLUÇÃO: Instale Docker:"
    echo "curl -fsSL https://get.docker.com | sh"
elif ! docker compose ps >/dev/null 2>&1; then
    echo "❌ PROBLEMA: Containers não estão rodando"
    echo "SOLUÇÃO: Inicie os containers:"
    echo "cd /opt/ncrisis && docker compose up -d"
elif ! curl -s http://localhost:5000/health >/dev/null 2>&1; then
    echo "❌ PROBLEMA: Aplicação não responde na porta 5000"
    echo "SOLUÇÃO: Verifique logs e reinicie:"
    echo "cd /opt/ncrisis && docker compose logs app"
    echo "cd /opt/ncrisis && docker compose restart app"
elif ! systemctl is-active nginx >/dev/null 2>&1; then
    echo "❌ PROBLEMA: Nginx não está ativo"
    echo "SOLUÇÃO: Inicie o Nginx:"
    echo "systemctl start nginx"
else
    echo "✅ TUDO PARECE OK - verifique logs acima para detalhes"
fi

echo
echo "Para mais ajuda, execute os comandos sugeridos e envie a saída."
# Diagnóstico VPS - Falha de Conexão

## Erro Detectado
```
curl: (7) Failed to connect to monster.e-ness.com.br port 5000 after 0 ms: Couldn't connect to server
```

## Comandos de Diagnóstico Imediato

Execute no servidor monster.e-ness.com.br:

### 1. Verificar se aplicação está rodando
```bash
# Verificar processos na porta 5000
sudo netstat -tlnp | grep :5000
sudo lsof -i :5000

# Verificar processos N.Crisis
ps aux | grep ncrisis
ps aux | grep node
```

### 2. Verificar Docker
```bash
# Status do Docker
sudo systemctl status docker

# Containers rodando
sudo docker ps -a

# Se há containers N.Crisis
sudo docker ps | grep ncrisis
```

### 3. Verificar logs
```bash
# Log da instalação
tail -50 /var/log/ncrisis-install.log

# Se Docker existe, logs dos containers
sudo docker logs ncrisis-app 2>/dev/null || echo "Container não encontrado"
```

### 4. Verificar diretório da aplicação
```bash
cd /opt/ncrisis
ls -la

# Verificar se é repositório git
git status

# Verificar arquivos principais
ls -la src/ frontend/ package.json docker-compose*.yml
```

## Possíveis Causas e Soluções

### Causa 1: Aplicação não foi iniciada
```bash
cd /opt/ncrisis

# Tentar iniciar com Docker
sudo docker compose -f docker-compose.production.yml up -d

# OU tentar iniciar direto
npm install
npm run build
npm start
```

### Causa 2: Firewall bloqueando porta 5000
```bash
# Verificar status firewall
sudo ufw status

# Permitir porta 5000
sudo ufw allow 5000/tcp
```

### Causa 3: Aplicação rodando em localhost apenas
```bash
# Verificar se está rodando apenas em 127.0.0.1
netstat -tlnp | grep 127.0.0.1:5000

# Se sim, verificar configuração de bind no código
grep -r "localhost\|127.0.0.1" /opt/ncrisis/src/
```

### Causa 4: Erro na instalação
```bash
# Verificar últimas linhas do log de instalação
tail -20 /var/log/ncrisis-install.log

# Se houve erro, pode precisar reexecutar partes do script
```

## Script de Correção Rápida

```bash
#!/bin/bash
cd /opt/ncrisis

echo "=== Diagnóstico N.Crisis ==="

# 1. Verificar diretório
if [[ ! -d "/opt/ncrisis" ]]; then
    echo "❌ Diretório /opt/ncrisis não existe"
    exit 1
fi

# 2. Verificar arquivos essenciais
if [[ ! -f "package.json" ]]; then
    echo "❌ package.json não encontrado"
    echo "Parece que o repositório não foi clonado corretamente"
    exit 1
fi

# 3. Verificar se Docker Compose existe
if [[ -f "docker-compose.production.yml" ]]; then
    echo "✅ Docker Compose encontrado"
    echo "Tentando iniciar com Docker..."
    sudo docker compose -f docker-compose.production.yml up -d
elif [[ -f "docker-compose.yml" ]]; then
    echo "✅ Docker Compose básico encontrado"
    sudo docker compose up -d
else
    echo "⚠️ Docker Compose não encontrado, tentando Node.js direto..."
    
    # Instalar dependências se necessário
    if [[ ! -d "node_modules" ]]; then
        echo "Instalando dependências..."
        npm install
    fi
    
    # Build se necessário
    if [[ ! -d "build" ]] && [[ -f "tsconfig.json" ]]; then
        echo "Compilando TypeScript..."
        npm run build
    fi
    
    # Iniciar aplicação
    echo "Iniciando aplicação..."
    PORT=5000 HOST=0.0.0.0 npm start &
fi

# 4. Aguardar e testar
sleep 10
echo "Testando conexão..."
curl -s http://localhost:5000/health || echo "❌ Falha no health check local"
```

Execute estes comandos no servidor e me informe os resultados, especialmente:
1. O que mostra `sudo netstat -tlnp | grep :5000`
2. O que mostra `tail -20 /var/log/ncrisis-install.log`
3. Se existe `/opt/ncrisis` e o que contém
# Análise de Conflitos de Porta - Traefik vs Nginx

## Situação Atual (Nginx)

### Portas em Uso:
- **80** → Nginx (HTTP)
- **443** → Nginx (HTTPS) - se SSL configurado
- **5000** → N.Crisis App (interno)
- **5433** → PostgreSQL (externo para acesso direto)
- **6380** → Redis (externo para debug)

## Migração para Traefik

### Conflitos Potenciais:

#### ❌ CONFLITO: Porta 80
```
Atual: Nginx escuta porta 80
Traefik: Também precisa da porta 80
SOLUÇÃO: Parar Nginx antes de iniciar Traefik
```

#### ❌ CONFLITO: Porta 443  
```
Atual: Nginx pode estar usando 443
Traefik: Também precisa da porta 443 para SSL
SOLUÇÃO: Parar Nginx completamente
```

#### ✅ SEM CONFLITO: Porta 8080
```
Traefik Dashboard: 8080
Nenhum serviço atual usa esta porta
```

#### ✅ SEM CONFLITO: Porta 9000
```
Portainer: 9000  
Nenhum serviço atual usa esta porta
```

## Plano de Migração Sem Conflitos

### Passo 1: Verificação de Portas
```bash
# Verificar portas em uso antes da migração
netstat -tlnp | grep -E ':80|:443|:8080|:9000'
lsof -i :80
lsof -i :443
```

### Passo 2: Parada Segura do Nginx
```bash
# Parar Nginx antes de iniciar Traefik
systemctl stop nginx
systemctl disable nginx

# Verificar se porta 80/443 estão livres
netstat -tlnp | grep -E ':80|:443'
```

### Passo 3: Mapeamento de Portas Traefik
```yaml
# Traefik Stack - SEM conflitos
traefik:
  ports:
    - "80:80"     # HTTP (era do Nginx)
    - "443:443"   # HTTPS (era do Nginx)  
    - "8080:8080" # Dashboard (nova)

portainer:
  ports:
    - "9000:9000" # Interface (nova)
```

### Passo 4: N.Crisis Isolado
```yaml
# N.Crisis - SEM exposição externa
app:
  # NENHUMA porta exposta externamente
  # Comunicação apenas via rede interna
  networks:
    - traefik  # Para Traefik acessar
    - internal # Para PostgreSQL/Redis

postgres:
  # NENHUMA porta exposta externamente
  # Acesso apenas via rede interna
  networks:
    - internal

redis:  
  # NENHUMA porta exposta externamente
  # Acesso apenas via rede interna
  networks:
    - internal
```

## Resultado Final - Portas

### Externas (acessíveis pela internet):
- **80** → Traefik HTTP (redireciona para 443)
- **443** → Traefik HTTPS 
- **8080** → Traefik Dashboard
- **9000** → Portainer Interface

### Internas (apenas containers):
- **5000** → N.Crisis (rede interna)
- **5432** → PostgreSQL (rede interna)
- **6379** → Redis (rede interna)

## Vantagens da Nova Configuração

### ✅ Segurança Aprimorada:
- PostgreSQL não fica exposto na internet
- Redis não fica exposto na internet
- Apenas Traefik tem acesso externo

### ✅ Sem Conflitos:
- Nginx completamente removido
- Traefik assume portas 80/443
- Novas portas 8080/9000 para gerenciamento

### ✅ Facilita Manutenção:
- Acesso direto ao banco apenas via Portainer
- Logs centralizados
- Interface visual para todos os containers

## Script de Verificação de Conflitos

```bash
#!/bin/bash
echo "=== VERIFICAÇÃO DE CONFLITOS DE PORTA ==="

# Portas que Traefik precisará
REQUIRED_PORTS="80 443 8080 9000"

for PORT in $REQUIRED_PORTS; do
    USAGE=$(lsof -ti:$PORT 2>/dev/null)
    if [ -n "$USAGE" ]; then
        echo "❌ CONFLITO: Porta $PORT em uso pelo processo $USAGE"
        ps -p $USAGE
    else
        echo "✅ LIVRE: Porta $PORT disponível"
    fi
done

echo
echo "Serviços que precisam ser parados:"
systemctl is-active nginx >/dev/null && echo "- Nginx (systemctl stop nginx)"
systemctl is-active apache2 >/dev/null && echo "- Apache (systemctl stop apache2)"
```

**Resposta: NÃO há conflitos na migração para Traefik, desde que o Nginx seja parado primeiro.**
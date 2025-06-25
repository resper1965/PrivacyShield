# Instalação Fácil - N.Crisis VPS

## Script Automatizado Completo

Execute apenas um comando no servidor para instalar tudo automaticamente:

### Comando Único (Copie e Cole)

```bash
curl -H "Authorization: token ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL" \
  -s "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh" | \
  grep '"content"' | cut -d'"' -f4 | base64 -d | \
  GITHUB_PERSONAL_ACCESS_TOKEN="ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL" \
  OPENAI_API_KEY="sua_chave_openai" \
  bash
```

### Alternativa Manual (Controle Total)

```bash
# 1. Conectar ao servidor
ssh root@monster.e-ness.com.br

# 2. Baixar script
curl -H "Authorization: token ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL" \
  -o install-vps-simples.sh \
  "https://api.github.com/repos/resper1965/PrivacyShield/contents/install-vps-simples.sh"

# 3. Executar com tokens
GITHUB_PERSONAL_ACCESS_TOKEN="ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL" \
OPENAI_API_KEY="sua_chave_openai" \
bash install-vps-simples.sh
```

## O que o Script Faz Automaticamente

1. **Corrige APT** - Remove repositórios duplicados
2. **Atualiza Sistema** - Ubuntu 22.04/24.04
3. **Instala Node.js 20** - Via NodeSource
4. **Instala PostgreSQL** - Cria banco ncrisis_db
5. **Instala Redis** - Cache e filas
6. **Instala ClamAV** - Antivírus
7. **Instala Nginx** - Proxy reverso
8. **Baixa Código** - GitHub privado
9. **Instala Dependências** - Backend + Frontend
10. **Compila Aplicação** - Build produção
11. **Configura Banco** - Prisma migrations
12. **Configura Systemd** - Serviço ncrisis
13. **Configura SSL** - Let's Encrypt
14. **Configura Firewall** - UFW
15. **Inicia Serviços** - Tudo funcionando

## Tempo Estimado

- **VPS Limpa**: 15-20 minutos
- **VPS com Dados**: 10-15 minutos

## Acesso Pós-Instalação

- **URL**: https://monster.e-ness.com.br
- **Dashboard**: https://monster.e-ness.com.br/
- **API Health**: https://monster.e-ness.com.br/health
- **Chat IA**: https://monster.e-ness.com.br/busca-ia

## Comandos Úteis Pós-Instalação

```bash
# Ver logs em tempo real
journalctl -u ncrisis -f

# Reiniciar serviço
systemctl restart ncrisis

# Status de todos os serviços
systemctl status ncrisis nginx postgresql redis-server

# Configurar chave OpenAI real
nano /opt/ncrisis/.env
systemctl restart ncrisis
```

## Resolução de Problemas

### Se algum serviço não iniciar:
```bash
systemctl status ncrisis
journalctl -u ncrisis --no-pager
```

### Se SSL falhar:
```bash
certbot --nginx -d monster.e-ness.com.br
```

### Se API não responder:
```bash
curl http://localhost:5000/health
netstat -tlnp | grep 5000
```

O script é totalmente automatizado e não requer interação manual durante a instalação.
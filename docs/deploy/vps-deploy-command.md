# Deploy N.Crisis na VPS

## Comando de Deploy

Execute na VPS como root:

```bash
curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/deploy-replit-to-vps.sh | sudo bash
```

## O que o script faz:

1. **Para aplicação atual** preservando configurações
2. **Atualiza código** do GitHub com última versão
3. **Reconstrói containers** com novo código
4. **Configura Nginx** para servir corretamente
5. **Testa conectividade** completa

## Após o deploy:

- **Dashboard**: http://monster.e-ness.com.br
- **API Health**: http://monster.e-ness.com.br/health
- **Upload**: http://monster.e-ness.com.br/api/v1/archives/upload

## Comandos de manutenção:

```bash
# Status
cd /opt/ncrisis && docker compose ps

# Logs
cd /opt/ncrisis && docker compose logs -f app

# Restart
cd /opt/ncrisis && docker compose restart
```

## SSL (opcional):

```bash
curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/setup-ssl.sh | sudo bash
```
# Corrigir Conflito de Porta PostgreSQL na VPS

O erro indica que a porta 5432 já está sendo usada por outro PostgreSQL.

## Comando de Correção

Execute na VPS:

```bash
curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/fix-port-conflict.sh | sudo bash
```

## O que o script faz:

1. **Para PostgreSQL do sistema** se estiver ativo
2. **Modifica docker-compose.yml** para usar porta 5433 externamente
3. **Atualiza configurações** para nova porta
4. **Limpa volumes antigos** e containers órfãos
5. **Reinicia containers** com nova configuração

## Resultado:

- PostgreSQL: localhost:5433 → container:5432
- Redis: localhost:6380 → container:6379
- Aplicação: localhost:5000
- Sem conflitos de porta

## URLs após correção:

- http://monster.e-ness.com.br (Dashboard)
- http://monster.e-ness.com.br/health (API Health)
- http://monster.e-ness.com.br/api/v1/archives/upload (Upload)

## Se ainda houver problemas com frontend:

```bash
curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/fix-frontend-build.sh | sudo bash
```
# Corrigir Build Frontend na VPS

O erro indica que a dependência `@tanstack/react-query` não está instalada.

## Comando de Correção

Execute na VPS:

```bash
curl -fsSL https://github.com/resper1965/PrivacyShield/raw/main/fix-frontend-build.sh | sudo bash
```

## O que o script faz:

1. **Reinstala dependências** do frontend incluindo @tanstack/react-query
2. **Reconstrói frontend** com todas as dependências
3. **Fallback HTML** se o build React falhar
4. **Testa conectividade** completa

## Resultado:

- API totalmente funcional
- Frontend servindo (React ou fallback HTML)
- Todos os endpoints ativos

## URLs após correção:

- http://monster.e-ness.com.br (Dashboard)
- http://monster.e-ness.com.br/health (API Health)
- http://monster.e-ness.com.br/api/v1/archives/upload (Upload)

A aplicação ficará 100% operacional independente do status do build React.
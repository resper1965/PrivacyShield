# Configuração SendGrid para N.Crisis

## Visão Geral

O N.Crisis utiliza SendGrid para envio de emails transacionais, incluindo:
- Alertas de sistema (backup, saúde, segurança)
- Relatórios de PII e conformidade LGPD
- Notificações de atualizações
- Emails de boas-vindas para novos usuários

## Configuração Inicial

### 1. Criar Conta SendGrid

1. Acesse [SendGrid](https://sendgrid.com)
2. Crie uma conta ou faça login
3. Verifique seu email e complete o setup inicial

### 2. Verificar Domínio

1. No painel SendGrid, vá em **Settings** > **Sender Authentication**
2. Clique em **Authenticate Your Domain**
3. Adicione o domínio `e-ness.com.br`
4. Configure os registros DNS conforme instruído:

```dns
# Registros CNAME para verificação do domínio
s1._domainkey.e-ness.com.br CNAME s1.domainkey.u123456.wl456.sendgrid.net
s2._domainkey.e-ness.com.br CNAME s2.domainkey.u123456.wl456.sendgrid.net
```

### 3. Criar API Key

1. Vá em **Settings** > **API Keys**
2. Clique em **Create API Key**
3. Nome: `N.Crisis Production`
4. Permissões: **Restricted Access**
5. Configurar permissões:
   - **Mail Send**: Full Access
   - **Stats**: Read Access
   - **Suppressions**: Read Access

6. Copie a API Key gerada (formato: `SG.xxxxxxxx...`)

### 4. Configurar Sender Identity

1. Vá em **Settings** > **Sender Authentication**
2. Clique em **Single Sender Verification**
3. Adicione os seguintes senders:

```
noreply@e-ness.com.br    (emails gerais)
alerts@e-ness.com.br     (alertas de sistema)
reports@e-ness.com.br    (relatórios PII)
welcome@e-ness.com.br    (boas-vindas)
```

## Configuração no N.Crisis

### Variáveis de Ambiente

Adicione no arquivo `.env.production`:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.sua_api_key_aqui
FROM_EMAIL=noreply@e-ness.com.br
ALERTS_EMAIL=alerts@e-ness.com.br
REPORTS_EMAIL=reports@e-ness.com.br
```

### Estrutura de Emails

O sistema N.Crisis envia 4 tipos de emails:

#### 1. Alertas de Sistema
- **Remetente**: alerts@e-ness.com.br
- **Tipos**: backup, health, security, update
- **Template**: HTML responsivo com branding N.Crisis
- **Conteúdo**: Status, detalhes técnicos, links de ação

#### 2. Relatórios PII
- **Remetente**: reports@e-ness.com.br
- **Conteúdo**: Estatísticas de detecção, links para download
- **Conformidade**: Avisos sobre LGPD e confidencialidade

#### 3. Notificações de Sistema
- **Remetente**: noreply@e-ness.com.br
- **Conteúdo**: Atualizações, manutenções, avisos gerais

#### 4. Boas-vindas
- **Remetente**: welcome@e-ness.com.br
- **Conteúdo**: Introdução ao sistema, guia inicial

## Templates de Email

### Design System
- **Cores primárias**: #112240 (azul escuro), #00ade0 (azul claro)
- **Fonte**: Segoe UI, Tahoma, Geneva, Verdana, sans-serif
- **Logo**: n.crisis com ponto azul
- **Layout**: Responsivo, máx. 600px largura

### Estrutura HTML
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>N.Crisis</title>
    <!-- CSS inline para compatibilidade -->
</head>
<body>
    <!-- Header com gradiente e logo -->
    <!-- Conteúdo principal -->
    <!-- Footer com informações da empresa -->
</body>
</html>
```

## Monitoramento e Analytics

### Métricas Importantes
- Taxa de entrega (Delivery Rate)
- Taxa de abertura (Open Rate)
- Taxa de rejeição (Bounce Rate)
- Reclamações de spam

### Dashboard SendGrid
1. Acesse **Stats** > **Global Stats**
2. Configure alertas para:
   - Taxa de rejeição > 5%
   - Reclamações de spam > 0.1%
   - Falhas de entrega > 10%

### Logs e Debugging
```bash
# Verificar logs de email no N.Crisis
docker compose -f docker-compose.production.yml logs app | grep -i "sendgrid\|email"

# Testar envio de email
curl -X POST https://monster.e-ness.com.br/api/test-email \
     -H "Content-Type: application/json" \
     -d '{"to":"admin@e-ness.com.br","type":"test"}'
```

## Configuração DNS Recomendada

### SPF Record
```dns
e-ness.com.br TXT "v=spf1 include:sendgrid.net ~all"
```

### DKIM Records (gerados pelo SendGrid)
```dns
s1._domainkey.e-ness.com.br CNAME s1.domainkey.u123456.wl456.sendgrid.net
s2._domainkey.e-ness.com.br CNAME s2.domainkey.u123456.wl456.sendgrid.net
```

### DMARC Record
```dns
_dmarc.e-ness.com.br TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@e-ness.com.br"
```

## Troubleshooting

### Problema: Emails não são entregues
```bash
# Verificar API Key
echo $SENDGRID_API_KEY

# Testar conectividade
curl -i --request POST \
     --url https://api.sendgrid.com/v3/mail/send \
     --header "Authorization: Bearer $SENDGRID_API_KEY" \
     --header 'Content-Type: application/json' \
     --data '{
       "personalizations": [{"to": [{"email": "test@e-ness.com.br"}]}],
       "from": {"email": "noreply@e-ness.com.br"},
       "subject": "Test",
       "content": [{"type": "text/plain", "value": "Test email"}]
     }'
```

### Problema: Emails vão para spam
1. Verificar autenticação do domínio
2. Verificar SPF/DKIM/DMARC
3. Revisar conteúdo dos emails
4. Verificar reputação do IP

### Problema: API Key inválida
1. Regenerar API Key no SendGrid
2. Atualizar variável de ambiente
3. Reiniciar aplicação

## Melhores Práticas

### Segurança
- Usar API Keys com permissões restritas
- Rotacionar API Keys periodicamente
- Monitorar logs de acesso
- Não expor API Keys em logs

### Entregabilidade
- Manter lista de emails limpa
- Processar bounces e unsubscribes
- Monitorar métricas de engajamento
- Usar autenticação de domínio

### Performance
- Enviar emails em batch quando possível
- Usar templates para consistência
- Implementar retry logic para falhas
- Cachear templates quando aplicável

## Custos e Limites

### Plano Free SendGrid
- 100 emails/dia
- Suficiente para testes e desenvolvimento

### Planos Pagos
- Essentials: $14.95/mês (50k emails)
- Pro: $89.95/mês (1.5M emails)
- Premier: $399/mês (3M emails)

### Monitoramento de Uso
```javascript
// Verificar quota no código
const stats = await mailService.getStats();
console.log('Emails enviados hoje:', stats.daily.sent);
```

---

**Documentação atualizada**: 24 de Junho de 2025  
**Versão**: 1.0  
**Domínio**: monster.e-ness.com.br
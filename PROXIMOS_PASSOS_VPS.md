# Próximos Passos Após install-vps-complete.sh

## Verificação da Instalação

### 1. Verificar Status dos Serviços
```bash
# Verificar se Docker está rodando
sudo systemctl status docker

# Verificar containers N.Crisis
sudo docker ps -a

# Verificar logs da instalação
tail -f /var/log/ncrisis-install.log
```

### 2. Verificar Aplicação
```bash
# Ir para diretório da aplicação
cd /opt/ncrisis

# Verificar se repositório foi clonado
ls -la

# Verificar health check
curl http://localhost:5000/health
```

## Configuração Final

### 3. Configurar Variáveis de Ambiente
```bash
cd /opt/ncrisis

# Copiar arquivo de exemplo
cp .env.example .env

# Editar configurações
nano .env
```

**Variáveis principais para configurar:**
- `DATABASE_URL` - PostgreSQL connection
- `SENDGRID_API_KEY` - Para emails
- `OPENAI_API_KEY` - Para análise AI (opcional)
- `CORS_ORIGINS` - Incluir monster.e-ness.com.br

### 4. Iniciar Aplicação
```bash
# Se usando Docker Compose
docker compose -f docker-compose.production.yml up -d

# Ou se usando Node.js direto
npm install
npm run build
npm start
```

### 5. Configurar SSL/HTTPS
```bash
# Verificar se Certbot foi instalado
certbot --version

# Obter certificado SSL
sudo certbot --nginx -d monster.e-ness.com.br
```

### 6. Configurar Firewall
```bash
# Verificar status do firewall
sudo ufw status

# Permitir portas necessárias
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
```

## Verificação Final

### 7. Testar Acesso Externo
```bash
# Testar do servidor
curl http://monster.e-ness.com.br:5000/health

# Verificar se responde
curl https://monster.e-ness.com.br/health
```

### 8. Monitoramento
```bash
# Verificar logs em tempo real
tail -f /var/log/ncrisis-install.log

# Logs da aplicação
docker logs ncrisis-app -f

# Status dos serviços
systemctl status nginx
systemctl status docker
```

## Comandos de Diagnóstico

### Se Algo Não Funcionar
```bash
# Verificar portas em uso
sudo netstat -tlnp | grep :5000

# Verificar processos N.Crisis
ps aux | grep ncrisis

# Verificar espaço em disco
df -h

# Verificar memória
free -h

# Reiniciar serviços
sudo systemctl restart nginx
sudo systemctl restart docker
```

## Próximos Passos por Cenário

### ✅ Se Tudo Funcionou
1. Configurar variáveis de ambiente
2. Testar upload de arquivos
3. Configurar backup automático
4. Documentar credenciais de acesso

### ⚠️ Se Há Problemas
1. Verificar logs de erro
2. Confirmar se todas as dependências foram instaladas
3. Verificar conectividade de rede
4. Executar comandos de diagnóstico

### 🔧 Para Desenvolvimento
1. Configurar ambiente de desenvolvimento
2. Configurar CI/CD se necessário
3. Configurar monitoramento adicional
4. Configurar backups

## Contato e Suporte

- **Health Check**: `curl http://monster.e-ness.com.br:5000/health`
- **Logs**: `/var/log/ncrisis-install.log`
- **Diretório**: `/opt/ncrisis`
- **Usuário**: `ncrisis`

---

**Status da Instalação**: Aguardando confirmação dos resultados do script
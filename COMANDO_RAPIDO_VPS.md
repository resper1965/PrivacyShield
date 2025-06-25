# Comando Rápido - Correção VPS N.Crisis

## Problema: Diretório já existe

Quando o erro `destination path '.' already exists and is not an empty directory` aparecer:

### Solução Imediata

```bash
# No servidor monster.e-ness.com.br
cd /opt/ncrisis

# Aplicar correção no script
sed -i 's/git clone "https:\/\/\$GITHUB_PERSONAL_ACCESS_TOKEN@github.com\/resper1965\/PrivacyShield.git" \. ||/if [[ -f "package.json" \&\& -f "src\/server-simple.ts" ]]; then\n        log "INFO" "Arquivos do repositório já presentes - pulando clone..."\n    else\n        git clone "https:\/\/\$GITHUB_PERSONAL_ACCESS_TOKEN@github.com\/resper1965\/PrivacyShield.git" \. ||/' install-ncrisis.sh

# Continuar instalação
sudo ./install-ncrisis.sh
```

### Comando One-Liner Completo

```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL" && export OPENAI_API_KEY="sua_chave" && cd /opt/ncrisis && sed -i 's/git clone "https:\/\/\$GITHUB_PERSONAL_ACCESS_TOKEN@github.com\/resper1965\/PrivacyShield.git" \. ||/if [[ -f "package.json" \&\& -f "src\/server-simple.ts" ]]; then\n        log "INFO" "Arquivos do repositório já presentes - pulando clone..."\n    else\n        git clone "https:\/\/\$GITHUB_PERSONAL_ACCESS_TOKEN@github.com\/resper1965\/PrivacyShield.git" \. ||/' install-ncrisis.sh && sudo ./install-ncrisis.sh
```

### Verificação Pós-Instalação

```bash
# Verificar serviços
sudo systemctl status ncrisis
sudo systemctl status postgresql
sudo systemctl status redis
sudo systemctl status nginx

# Verificar logs
sudo journalctl -u ncrisis -f

# Teste de conectividade
curl http://localhost:3000/health
curl https://monster.e-ness.com.br/health
```
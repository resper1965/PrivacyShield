# Diretórios de Instalação N.Crisis

**Repositório**: https://github.com/resper1965/PrivacyShield  
**Domínio**: monster.e-ness.com.br

## Clonagem do Repositório

### Comando Usado nos Scripts
```bash
# O repositório é clonado DIRETAMENTE para /opt/ncrisis
sudo -u ncrisis git clone https://token@github.com/resper1965/PrivacyShield.git /opt/ncrisis
```

### Estrutura Resultante
```
/opt/ncrisis/          # Conteúdo completo do repositório
├── src/               # Código fonte TypeScript (do repo)
├── frontend/          # Aplicação React (do repo)
├── scripts/           # Scripts de instalação (do repo)
├── uploads/           # Arquivos enviados via upload
├── local_files/       # Arquivos ZIP locais
├── shared_folders/    # Pastas compartilhadas
├── logs/              # Logs da aplicação
├── backups/           # Backups automáticos
├── package.json       # Dependências (do repo)
├── README.md          # Documentação (do repo)
└── docker-compose.production.yml (do repo)
```

### Por que `/opt/ncrisis`?

**Vantagens:**
1. **Nome da marca**: Reflete o nome do produto "n.crisis"
2. **Simplicidade**: Caminho curto e fácil de lembrar
3. **Padrão Linux**: `/opt` é o local padrão para aplicações de terceiros
4. **Consistência**: Usuário `ncrisis` + diretório `ncrisis`
5. **Scripts prontos**: Todos os scripts já usam este padrão

**Estrutura completa:**
```bash
/opt/ncrisis/          # Aplicação
/var/log/ncrisis-*.log # Logs do sistema
/home/ncrisis/         # Home do usuário
/etc/systemd/system/ncrisis-* # Serviços
```

## Comandos de Navegação

```bash
# Acessar aplicação
cd /opt/ncrisis

# Trocar para usuário da aplicação
sudo su - ncrisis

# Ver logs
tail -f /var/log/ncrisis-*.log

# Verificar serviços
systemctl status ncrisis-*
```

## Permissões

```bash
# Proprietário: usuário ncrisis
drwxr-xr-x ncrisis ncrisis /opt/ncrisis/

# Arquivos executáveis
-rwxr-xr-x ncrisis ncrisis scripts/*.sh

# Arquivos de configuração
-rw-r--r-- ncrisis ncrisis *.yml *.json
```

## Alternativa (não recomendada)

Se preferir usar o nome do repositório:
```bash
/opt/PrivacyShield/  # Nome do repositório GitHub
```

**Desvantagens:**
- Nome mais longo
- Inconsistente com usuário `ncrisis`
- Todos os scripts precisariam ser alterados
- Menos intuitivo para a marca

---

**Recomendação**: Manter `/opt/ncrisis` como padrão estabelecido.
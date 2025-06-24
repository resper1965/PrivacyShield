# Configuração do GitHub Personal Access Token

## Variável de Ambiente Padrão

O N.Crisis utiliza a variável de ambiente `GITHUB_PERSONAL_ACCESS_TOKEN` para autenticação com o repositório privado.

## Configuração no Servidor

### 1. Definir Token Temporariamente
```bash
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### 2. Definir Token Permanentemente
```bash
# Adicionar ao .bashrc do usuário root
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"' >> ~/.bashrc
source ~/.bashrc

# Adicionar ao .bashrc do usuário ncrisis
echo 'export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"' >> /home/ncrisis/.bashrc
```

### 3. Verificar Configuração
```bash
echo $GITHUB_PERSONAL_ACCESS_TOKEN
```

## Uso nos Scripts

### Clone com Token
```bash
# Verificar se token está definido
if [[ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]]; then
    echo "ERRO: GITHUB_PERSONAL_ACCESS_TOKEN não definido"
    exit 1
fi

# Clonar repositório
git clone https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git
```

### Download de Scripts
```bash
# Com header de autorização
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh \
     -o install-docker.sh

# Com token na URL
curl https://$GITHUB_PERSONAL_ACCESS_TOKEN@raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh \
     -o install-docker.sh
```

## Comandos para monster.e-ness.com.br

### Instalação Completa
```bash
# 1. Definir token
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token_aqui"

# 2. Instalar Docker
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-docker.sh \
     -o install-docker.sh
chmod +x install-docker.sh
sudo ./install-docker.sh

# 3. Clonar repositório
sudo su - ncrisis
export GITHUB_PERSONAL_ACCESS_TOKEN="seu_token_aqui"
cd /opt/ncrisis
git clone https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git .

# 4. Instalar aplicação
chmod +x scripts/*.sh
./scripts/install-production.sh

# 5. Configurar SSL (como root)
exit
./scripts/ssl-setup.sh
```

## Segurança

### Boas Práticas
1. **Nunca commitar** o token em código
2. **Usar apenas HTTPS** para clonagem
3. **Rotacionar tokens** periodicamente
4. **Revogar tokens** não utilizados
5. **Usar scopes mínimos** necessários

### Permissões Necessárias
- ✅ `repo` - Full control of private repositories
- ✅ `read:org` - Read org and team membership

### Exemplo Seguro
```bash
#!/bin/bash
# Script de instalação seguro

# Verificar se token está definido
if [[ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]]; then
    echo "ERRO: Defina GITHUB_PERSONAL_ACCESS_TOKEN primeiro"
    echo "export GITHUB_PERSONAL_ACCESS_TOKEN=\"seu_token_aqui\""
    exit 1
fi

# Verificar se token tem formato válido
if [[ ! "$GITHUB_PERSONAL_ACCESS_TOKEN" =~ ^ghp_[a-zA-Z0-9]{36}$ ]] && \
   [[ ! "$GITHUB_PERSONAL_ACCESS_TOKEN" =~ ^github_pat_[a-zA-Z0-9_]{82,}$ ]]; then
    echo "AVISO: Formato de token não reconhecido"
fi

# Testar acesso ao repositório
if ! git ls-remote https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/resper1965/PrivacyShield.git &>/dev/null; then
    echo "ERRO: Não foi possível acessar o repositório"
    echo "Verifique se o token tem as permissões corretas"
    exit 1
fi

echo "Token configurado e validado com sucesso!"
```

## Troubleshooting

### Token Inválido
```bash
# Verificar se token existe
echo $GITHUB_PERSONAL_ACCESS_TOKEN

# Testar acesso
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" https://api.github.com/user

# Verificar permissões
curl -H "Authorization: token $GITHUB_PERSONAL_ACCESS_TOKEN" \
     https://api.github.com/repos/resper1965/PrivacyShield
```

### Token Expirado
1. Ir para https://github.com/settings/tokens
2. Verificar data de expiração
3. Renovar ou criar novo token
4. Atualizar variável de ambiente

### Repositório Não Encontrado
1. Verificar se usuário tem acesso ao repositório
2. Verificar se token tem scope `repo`
3. Solicitar acesso ao proprietário do repositório

---

**Data**: 24 de Junho de 2025  
**Versão**: 1.0  
**Repositório**: https://github.com/resper1965/PrivacyShield.git
# Instalação com Passphrase - Método Simplificado

## Comando Direto (Mais Fácil)

```bash
# Baixar script
wget https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-com-passphrase.sh

# Executar (irá pedir as chaves)
sudo bash install-com-passphrase.sh
```

## Com Variáveis Pré-definidas

```bash
# Definir chaves
export GITHUB_TOKEN="sua_chave_github"
export OPENAI_KEY="sua_chave_openai"

# Executar instalação
sudo -E bash install-com-passphrase.sh
```

## O que Este Método Faz

1. **Solicita chaves interativamente** - Não precisa editar arquivos
2. **Usa oauth2 no git clone** - Mais simples que bearer token
3. **Instala tudo automaticamente** - Sistema completo
4. **Funciona sem pipe complexo** - Método mais direto

## Vantagens do Método Passphrase

- Não depende de encoding base64
- Não usa pipes complexos
- Script local é mais fácil de debugar
- Solicita chaves se não definidas
- Funciona com qualquer terminal

Execute o comando e digite suas chaves quando solicitado. O script instalará todo o ambiente N.Crisis automaticamente.
# Correção Token GitHub - Comando Direto

## Problema
O script não reconhece o `GITHUB_PERSONAL_ACCESS_TOKEN` configurado como `export`.

## Solução Imediata

Execute este comando no servidor monster.e-ness.com.br:

```bash
cd /opt/ncrisis

# Definir tokens na mesma linha do comando
GITHUB_PERSONAL_ACCESS_TOKEN="ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL" OPENAI_API_KEY="sua_chave" sudo -E ./install-ncrisis.sh
```

## Alternativa com Export Forçado

```bash
cd /opt/ncrisis

# Forçar carregamento das variáveis
export GITHUB_PERSONAL_ACCESS_TOKEN="ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL"
export OPENAI_API_KEY="sua_chave_openai"

# Passar para sudo com preserve-env
sudo --preserve-env=GITHUB_PERSONAL_ACCESS_TOKEN,OPENAI_API_KEY ./install-ncrisis.sh
```

## Comando One-Liner Completo

```bash
cd /opt/ncrisis && GITHUB_PERSONAL_ACCESS_TOKEN="ghp_H1MWEVFG8RIqYSKtmBQAk1XqA1cjyAFmL" OPENAI_API_KEY="sua_chave" sudo -E ./install-ncrisis.sh
```

A correção aplicada no script:
- Remove erro fatal na verificação inicial de token
- Permite que o script continue mesmo sem token inicialmente
- Verifica token apenas quando necessário para clone
- Adiciona carregamento automático de ~/.bashrc e /etc/environment
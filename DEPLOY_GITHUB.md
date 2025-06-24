# Deploy no GitHub - N.Crisis

Este guia explica como enviar o projeto N.Crisis para um repositório GitHub.

## 🚀 Passos para Deploy no GitHub

### 1. Criar Repositório no GitHub

1. Acesse [GitHub](https://github.com) e faça login
2. Clique em **"New repository"** ou **"+"** > **"New repository"**
3. Configure o repositório:
   - **Repository name**: `ncrisis` (ou nome de sua preferência)
   - **Description**: `PII Detection & LGPD Compliance Platform`
   - **Visibility**: Public ou Private (sua escolha)
   - **NÃO** marque "Initialize with README" (já temos um)
4. Clique em **"Create repository"**

### 2. Configurar Git Local (se necessário)

```bash
# Configurar identidade (se não configurado)
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@exemplo.com"

# Verificar status do repositório
git status
```

### 3. Conectar com GitHub

```bash
# Adicionar remote origin (substitua pelo seu repositório)
git remote add origin https://github.com/SEU-USUARIO/ncrisis.git

# Verificar remote
git remote -v
```

### 4. Enviar Código para GitHub

```bash
# Verificar arquivos a serem enviados
git status

# Adicionar todos os arquivos (se necessário)
git add .

# Fazer commit (se houver mudanças)
git commit -m "docs: add GitHub deployment documentation"

# Enviar para GitHub
git push -u origin main
```

## 📁 Arquivos Incluídos no Repositório

### Código Fonte
- ✅ `src/` - Backend TypeScript completo
- ✅ `frontend/` - Frontend React completo
- ✅ `package.json` - Dependências e scripts
- ✅ `tsconfig.json` - Configuração TypeScript

### Configuração
- ✅ `docker-compose.yml` - Orquestração Docker
- ✅ `Dockerfile` - Container build
- ✅ `deploy.sh` - Script de deploy automatizado
- ✅ `init.sql` - Schema do banco de dados
- ✅ `.env.example` - Exemplo de variáveis de ambiente

### Documentação
- ✅ `README.md` - Documentação principal
- ✅ `CONTRIBUTING.md` - Guia de contribuição
- ✅ `CHANGELOG.md` - Histórico de mudanças
- ✅ `LICENSE` - Licença MIT

### Estrutura de Pastas
- ✅ `uploads/` - Para arquivos via upload web
- ✅ `local_files/` - Para ZIPs locais
- ✅ `shared_folders/` - Para pastas compartilhadas
- ✅ `.gitkeep` em pastas vazias para manter estrutura

### Configuração Git
- ✅ `.gitignore` - Arquivos a serem ignorados
- ✅ Commit inicial com todo o código

## 🔧 Configurações Importantes

### .gitignore Configurado
O arquivo `.gitignore` já está configurado para ignorar:
- `node_modules/`
- `build/` e `dist/`
- `.env` e variáveis sensíveis
- `logs/` e arquivos de log
- Arquivos temporários
- Uploads reais (mantém estrutura com `.gitkeep`)

### Secrets/Variáveis Sensíveis
- ❌ **Nunca** commitamos arquivos `.env` reais
- ✅ Incluímos `.env.example` como template
- ✅ Documentamos todas as variáveis necessárias

## 🌟 Recursos Prontos para GitHub

### GitHub Pages (opcional)
Para hospedar documentação:
```bash
# Criar branch gh-pages
git checkout -b gh-pages
git push origin gh-pages
```

### Issues Templates
Pode criar `.github/ISSUE_TEMPLATE/` para padronizar issues.

### Actions/CI (futuro)
Estrutura pronta para adicionar GitHub Actions em `.github/workflows/`.

## 📋 Checklist de Verificação

Antes de fazer push, verifique:

- ✅ Todos os arquivos importantes estão incluídos
- ✅ `.gitignore` está configurado corretamente
- ✅ Não há credenciais ou dados sensíveis commitados
- ✅ README.md está atualizado e informativo
- ✅ `package.json` tem informações corretas
- ✅ Projeto builda sem erros (`npm run build`)
- ✅ Testes passam (`npm test`)
- ✅ Docker compose funciona (`docker-compose up`)

## 🔄 Workflow Recomendado

### Para Desenvolvimento Contínuo
```bash
# 1. Fazer mudanças
# 2. Testar localmente
npm run dev

# 3. Commit das mudanças
git add .
git commit -m "feat: nova funcionalidade X"

# 4. Push para GitHub
git push origin main
```

### Para Releases
```bash
# 1. Atualizar CHANGELOG.md
# 2. Atualizar versão no package.json
# 3. Commit de release
git add .
git commit -m "release: v1.1.0"

# 4. Criar tag
git tag v1.1.0

# 5. Push com tags
git push origin main --tags
```

## 🚀 Deploy Automático (futuro)

O projeto está estruturado para adicionar CI/CD:

### GitHub Actions (exemplo)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm test
```

## 📞 Suporte

Se tiver problemas no deploy:

1. **Erro de permissão**: Verifique suas credenciais GitHub
2. **Arquivos grandes**: Use Git LFS se necessário
3. **Merge conflicts**: Resolva conflitos antes do push
4. **Remote não encontrado**: Verifique a URL do repositório

## 🎯 Próximos Passos

Após o deploy no GitHub:

1. ⭐ **Star** o repositório para popularidade
2. 📝 Adicionar **topics/tags** relevantes
3. 🔗 Configurar **GitHub Pages** para docs
4. 🤖 Adicionar **GitHub Actions** para CI/CD
5. 📊 Configurar **GitHub Projects** para gerenciamento
6. 🛡️ Adicionar **dependabot** para security updates

O projeto N.Crisis está agora pronto para ser desenvolvido colaborativamente no GitHub! 🚀
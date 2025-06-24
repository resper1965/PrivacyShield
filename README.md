# N.Crisis - PII Detection & LGPD Compliance Platform

Sistema completo de detecção de informações pessoais (PII) com foco na conformidade com a LGPD brasileira.

Consulte a [documentacao completa](docs/README.md) para guias detalhados.

## 🎯 Funcionalidades

### Detecção de PII
- **CPF/CNPJ**: Validação com algoritmos brasileiros
- **Nome Próprio**: Detecção de nomes brasileiros completos
- **Contatos**: Email e telefone com padrões nacionais
- **Documentos**: RG, PIS/PASEP, Título de Eleitor, CEP
- **Regex Personalizados**: Sistema flexível para padrões customizados

### Análise de Arquivos
- **Upload Individual**: Arquivos únicos via interface web
- **Upload ZIP**: Processamento em lote de arquivos compactados
- **Arquivos Locais**: Análise de ZIPs já existentes no servidor
- **Pastas Compartilhadas**: Análise recursiva de diretórios

### Gestão de Incidentes LGPD
- **Cadastro de Incidentes**: Registro completo de violações
- **Análise LGPD**: Mapeamento automático de artigos aplicáveis
- **Organizações**: Gestão de empresas e CNPJs
- **Usuários**: Controle de acesso e responsabilidades

### Relatórios e Compliance
- **Dashboard**: Estatísticas em tempo real
- **Relatório Consolidado**: Visão geral das detecções
- **Por Titular**: Agrupamento por pessoa física
- **Por Organização**: Análise corporativa
- **Export**: CSV e PDF para auditoria

## 🏗️ Arquitetura

### Backend
- **Node.js 20** com TypeScript
- **Express.js** para API REST
- **PostgreSQL** com Prisma ORM
- **Redis** para cache e filas
- **Socket.IO** para atualizações em tempo real

### Frontend
- **React 18** com TypeScript
- **Vite** para build otimizado
- **React Router** para navegação
- **Axios** para comunicação com API

### Segurança
- **ClamAV** para escaneamento de vírus
- **Helmet** para headers de segurança
- **CORS** configurável por ambiente
- **Validação** de entrada em todas as APIs

## 🚀 Instalação

### Desenvolvimento
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/ncrisis.git
cd ncrisis

# Instale dependências
npm install
cd frontend && npm install && cd ..

# Configure o banco de dados
cp .env.example .env
# Edite .env com suas configurações

# Execute migrações
npm run db:push

# Inicie o desenvolvimento
# O servidor principal fica em `src/server-simple.ts`. O comando abaixo utiliza
# `ts-node` para executar esse arquivo diretamente.
npm run dev
```

### Produção com Docker
```bash
# Deploy completo
./deploy.sh homolog

# Ou manualmente
docker-compose up --build -d

# Verificar status
docker-compose ps
```

O container executa `node build/src/server-simple.js`, que corresponde ao
servidor principal compilado a partir de `src/server-simple.ts`.

## 📁 Estrutura de Pastas

```
.
├── src/                    # Backend TypeScript
│   ├── server-simple.ts    # Servidor principal
│   ├── detectPII.ts       # Engine de detecção
│   ├── regexPatterns.ts    # Padrões regex
│   └── ...
├── frontend/               # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── components/    # Componentes reutilizáveis
│   │   └── ...
├── uploads/               # Arquivos via upload web
├── local_files/          # ZIPs locais para análise
├── shared_folders/       # Pastas compartilhadas
├── docker-compose.yml    # Orquestração Docker
└── deploy.sh            # Script de deploy
```

## 🔧 Configuração

### Variáveis de Ambiente
```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ncrisis

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# OpenAI (para análise avançada)
OPENAI_API_KEY=sk-...

# Servidor
NODE_ENV=production
PORT=8000
```

### Arquivos de Dados

#### Arquivos ZIP Locais
Coloque arquivos ZIP em `/local_files/` para análise via interface:
```bash
cp seus_arquivos.zip local_files/
```

#### Pastas Compartilhadas
Configure diretórios em `/shared_folders/` para análise recursiva:
```bash
mkdir -p shared_folders/documentos_empresa
cp -r /path/to/docs/* shared_folders/documentos_empresa/
```

## 📊 APIs Principais

### Detecções
- `GET /api/v1/detections` - Lista detecções
- `POST /api/v1/archives/upload` - Upload de arquivo

### Regex Patterns
- `GET /api/v1/regex-patterns` - Lista padrões
- `POST /api/v1/regex-patterns` - Cria padrão
- `POST /api/v1/regex-patterns/test` - Testa padrão

### Pastas e Arquivos
- `GET /api/v1/local-zips` - Lista ZIPs locais
- `GET /api/v1/folders/available` - Lista pastas
- `POST /api/v1/folders/analyze` - Analisa pasta

### Relatórios
- `GET /api/v1/reports/lgpd/consolidado` - Relatório consolidado
- `GET /api/v1/reports/lgpd/titulares` - Por titular
- `GET /api/v1/reports/lgpd/organizacoes` - Por organização

## 🛡️ Segurança

### Validação de Arquivos
- Escaneamento antivírus obrigatório
- Validação de tipos MIME
- Proteção contra zip bombs
- Limites de tamanho configuráveis

### Detecção de PII
- Validação algorítmica para CPF/CNPJ
- Padrões específicos para Brasil
- Falsos positivos minimizados
- Context-aware detection

### Compliance LGPD
- Mapeamento automático de artigos
- Classificação de riscos
- Auditoria completa
- Relatórios para DPO

## 📈 Monitoramento

### Health Checks
- `GET /health` - Status da aplicação
- `GET /api/queue/status` - Status das filas
- Métricas do Docker incluídas

### Logs
- Logs estruturados com Pino
- Rotação automática
- Níveis configuráveis
- Integração com Docker logs

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para suporte e dúvidas:
- 📧 Email: suporte@ncrisis.com.br
- 📖 Documentação: [docs.ncrisis.com.br](https://docs.ncrisis.com.br)
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/ncrisis/issues)

## 🏆 Changelog

### v1.0.0 (2025-06-24)
- Sistema completo de detecção PII
- Interface React moderna
- Compliance LGPD integrado
- Sistema de regex personalizados
- Deploy Docker automatizado
- Análise de pastas locais e compartilhadas
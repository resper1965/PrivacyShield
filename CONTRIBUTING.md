# Guia de Contribuição - N.Crisis

Obrigado por contribuir com o N.Crisis! Este guia ajudará você a configurar o ambiente e seguir nossas práticas de desenvolvimento.

## 🛠️ Configuração do Ambiente

### Pré-requisitos
- Node.js 20+
- Docker e Docker Compose
- PostgreSQL (local ou Docker)
- Git

### Setup Inicial
```bash
# 1. Fork e clone o repositório
git clone https://github.com/seu-usuario/ncrisis.git
cd ncrisis

# 2. Instale dependências
npm install
cd frontend && npm install && cd ..

# 3. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# 4. Inicie o banco de dados
docker-compose up postgres redis -d

# 5. Execute migrações
npm run db:push

# 6. Inicie o desenvolvimento
npm run dev
```

## 📋 Padrões de Código

### TypeScript
- Use strict mode
- Prefira interfaces sobre types
- Documente funções públicas com JSDoc
- Use async/await em vez de Promises

### React
- Functional components com hooks
- Props tipadas com interfaces
- Use memo() para otimização quando necessário
- Prefira composição sobre herança

### Estilo de Código
```typescript
// ✅ Bom
interface UserProps {
  id: string;
  name: string;
  email: string;
}

export const UserCard: React.FC<UserProps> = ({ id, name, email }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = useCallback(async () => {
    setIsLoading(true);
    try {
      await updateUser(id, { name, email });
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setIsLoading(false);
    }
  }, [id, name, email]);

  return (
    <div className="user-card">
      <h3>{name}</h3>
      <p>{email}</p>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? 'Updating...' : 'Update'}
      </button>
    </div>
  );
};
```

### Nomenclatura
- **Variáveis/Funções**: camelCase (`getUserData`)
- **Componentes**: PascalCase (`UserCard`)
- **Constantes**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Arquivos**: kebab-case (`user-card.tsx`)

## 🔧 Estrutura do Projeto

### Backend (`src/`)
```
src/
├── server-simple.ts      # Servidor principal
├── detectPII.ts         # Engine de detecção PII
├── regexPatterns.ts     # Gestão de padrões regex
├── database.ts          # Configuração do banco
├── repository.ts        # Operações de dados
├── processor.ts         # Processamento com IA
├── virusScanner.ts      # Escaneamento de vírus
└── zipExtractor.ts      # Extração segura de ZIPs
```

### Frontend (`frontend/src/`)
```
frontend/src/
├── pages/               # Páginas da aplicação
│   ├── Dashboard.tsx
│   ├── TelaArquivos.tsx
│   ├── TelaAnalise.tsx
│   └── ...
├── components/          # Componentes reutilizáveis
│   ├── SimpleLayout.tsx
│   ├── TabsArquivos.tsx
│   └── ...
├── hooks/              # Custom hooks
│   └── useWebSocket.tsx
└── AppRoutes.tsx       # Configuração de rotas
```

## 🧪 Testes

### Backend
```bash
# Executar testes
npm test

# Testes com coverage
npm run test:coverage

# Testes em modo watch
npm run test:watch
```

### Frontend
```bash
# Testes do frontend
cd frontend && npm test
```

### Estrutura de Testes
```typescript
// tests/detectPII.test.ts
import { detectPIIInText } from '../src/detectPII';

describe('PII Detection', () => {
  describe('CPF Detection', () => {
    it('should detect valid CPF', () => {
      const text = 'CPF: 123.456.789-09';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(1);
      expect(detections[0].documento).toBe('CPF');
      expect(detections[0].valor).toBe('123.456.789-09');
    });

    it('should not detect invalid CPF', () => {
      const text = 'CPF: 111.111.111-11';
      const detections = detectPIIInText(text, 'test.txt');
      
      expect(detections).toHaveLength(0);
    });
  });
});
```

## 🔄 Workflow de Desenvolvimento

### Branches
- `main`: Produção estável
- `develop`: Desenvolvimento ativo
- `feature/nome-da-feature`: Novas funcionalidades
- `bugfix/nome-do-bug`: Correções
- `hotfix/nome-do-hotfix`: Correções urgentes

### Commits
Use conventional commits:
```bash
# Funcionalidade
git commit -m "feat: add regex pattern management"

# Correção
git commit -m "fix: CPF validation algorithm"

# Documentação
git commit -m "docs: update API documentation"

# Refatoração
git commit -m "refactor: improve PII detection performance"

# Testes
git commit -m "test: add CPF detection unit tests"
```

### Pull Requests
1. Crie uma branch a partir de `develop`
2. Faça suas alterações com testes
3. Atualize documentação se necessário
4. Execute linting e testes
5. Abra PR para `develop`

Template de PR:
```markdown
## Descrição
Breve descrição das mudanças realizadas.

## Tipo de Mudança
- [ ] Bug fix (mudança que corrige um problema)
- [ ] Nova funcionalidade (mudança que adiciona funcionalidade)
- [ ] Breaking change (mudança que quebra compatibilidade)
- [ ] Documentação

## Como Testar
1. Execute `npm run dev`
2. Navegue para `/nova-funcionalidade`
3. Verifique que...

## Checklist
- [ ] Código segue os padrões do projeto
- [ ] Testes foram adicionados/atualizados
- [ ] Documentação foi atualizada
- [ ] Linting passa sem erros
```

## 🚀 Deploy

### Desenvolvimento
```bash
# Desenvolvimento local
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

### Homologação
```bash
# Deploy automático
./deploy.sh homolog

# Verificar logs
docker-compose logs -f app
```

### Produção
```bash
# Deploy para produção
./deploy.sh production

# Monitoramento
docker-compose ps
curl http://localhost:8000/health
```

## 📊 Padrões de API

### Responses
```typescript
// Sucesso
{
  "success": true,
  "data": {...},
  "message": "Operação realizada com sucesso"
}

// Erro
{
  "error": "ERROR_CODE",
  "message": "Mensagem legível",
  "statusCode": 400,
  "timestamp": "2025-06-24T12:00:00Z"
}
```

### Validação
```typescript
import { body, validationResult } from 'express-validator';

app.post('/api/users',
  body('email').isEmail(),
  body('name').isLength({ min: 2 }),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Dados inválidos',
        details: errors.array()
      });
    }
    // ...
  }
);
```

## 🐛 Debug

### Backend
```bash
# Debug com inspect
npm run dev:debug

# Logs detalhados
DEBUG=ncrisis:* npm run dev
```

### Frontend
```bash
# Dev tools habilitados
npm run dev

# Build de debug
npm run build:debug
```

## 📝 Documentação

### Código
- Documente funções públicas
- Use JSDoc para TypeScript
- Mantenha README atualizado
- Comente lógicas complexas

### APIs
- Documente endpoints
- Inclua exemplos de request/response
- Mantenha Postman collection atualizada
- Use OpenAPI quando possível

## ⚠️ Segurança

### Code Review
- Nunca commite credenciais
- Valide todas as entradas
- Use prepared statements
- Sanitize outputs

### Dependências
```bash
# Auditoria de segurança
npm audit

# Correção automática
npm audit fix

# Verificação manual
npm outdated
```

## 🤝 Comunidade

### Comunicação
- Issues do GitHub para bugs e features
- Discussions para dúvidas
- Wiki para documentação extensa

### Code of Conduct
- Seja respeitoso e inclusivo
- Foque no problema, não na pessoa
- Aceite feedback construtivo
- Ajude outros desenvolvedores

## 📚 Recursos

### Links Úteis
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Express.js Guide](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

### Ferramentas
- **VS Code**: Editor recomendado
- **Extensões**: ESLint, Prettier, TypeScript
- **Postman**: Teste de APIs
- **Docker Desktop**: Containerização

Obrigado por contribuir com o N.Crisis! 🚀
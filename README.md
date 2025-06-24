# PIIDetector - PrivacyDetective

Sistema TypeScript para processamento seguro e detecção de PII em arquivos ZIP com proteções de segurança abrangentes.

## Funcionalidades Principais

- **Processamento Seguro de ZIP**: Upload e processamento com validações avançadas de segurança
- **Detecção de PII**: Detecta CPF, CNPJ, Email e Telefone usando validação por regex
- **Escaneamento de Vírus**: Integração ClamAV com fallback para desenvolvimento
- **Proteções de Segurança**: 
  - Prevenção contra ataques de zip traversal
  - Limite de ratio de compressão (máximo 100x)
  - Limites de tamanho (100MB por arquivo, 50MB por ZIP)
  - Validação de tipo MIME
- **Acesso Duplo a Arquivos**: Upload via API ou cópia direta para diretório compartilhado
- **Armazenamento em Memória**: Sem dependência de banco externo
- **API RESTful**: Endpoints abrangentes com respostas padronizadas

## Proteções de Segurança

### Extração Segura de ZIP (Implementação R2)

A função `extractZipFiles()` inclui múltiplas camadas de segurança:

1. **Proteção contra Traversal**: Bloqueia `../`, caminhos absolutos e bytes nulos
2. **Limite de Ratio de Compressão**: Máximo 100x (descomprimido/comprimido)
3. **Limites de Tamanho**: 
   - Arquivos individuais: 100MB máximo
   - Arquivo ZIP: 50MB máximo
4. **Limite de Quantidade**: Máximo 1.000 arquivos por ZIP
5. **Validação MIME**: Aceita `application/zip` e `application/octet-stream`

### Escaneamento de Vírus

- Integração ClamAV usando `clamdjs`
- Retorna status 422 para arquivos infectados
- Fallback gracioso para ambientes de desenvolvimento

## Endpoints da API

### Verificação de Saúde
```
GET /health
```

### Upload de Arquivo ZIP
```
POST /api/zip
Content-Type: multipart/form-data
Body: file (arquivo ZIP)

Resposta: JSON com contagem de detecções e resultados do scan
```

### Listar Arquivos Disponíveis
```
GET /api/zip/list

Resposta: Array JSON de arquivos no diretório uploads
```

### Processar Arquivo ZIP Local
```
GET /api/zip/local?name=arquivo.zip

Resposta: JSON com resultados de detecção para o arquivo especificado
```

### Relatório de PII (Filtrado)
```
GET /api/report/titulares?domain=empresa.com&cnpj=12.345.678/0001-90

Resposta: Detecções de PII filtradas por domínio e/ou CNPJ
```

## Padrões de Detecção de PII

- **CPF**: ID de contribuinte individual brasileiro com algoritmo de validação
- **CNPJ**: ID de contribuinte empresa brasileira com algoritmo de validação  
- **Email**: Validação de formato de email padrão
- **Telefone**: Padrões de número de telefone brasileiro

## Estrutura de Diretórios

```
uploads/          # Diretório compartilhado para arquivos enviados e copiados
tmp/             # Diretório temporário de extração
src/
  ├── server.ts        # Servidor Express principal
  ├── detectPII.ts     # Lógica de detecção de PII
  ├── virusScanner.ts  # Integração ClamAV
  ├── zipExtractor.ts  # Extração segura de ZIP (R2)
  └── types/          # Definições TypeScript
```

## Desenvolvimento

```bash
npm install
npm run dev
```

O servidor iniciará em `http://0.0.0.0:8000`

## Produção

```bash
npm run build
npm start
```

## Variáveis de Ambiente

- `NODE_ENV`: development/production
- `PORT`: Porta do servidor (padrão: 8000)
- `HOST`: Host do servidor (padrão: 0.0.0.0)

## Fluxo de Processamento de Arquivos

1. **Upload/Acesso a Arquivo**: Via POST /api/zip ou cópia direta para uploads/
2. **Validação MIME**: Verificar tipo de arquivo ZIP
3. **Escaneamento de Vírus**: Scan ClamAV com resposta 422 para ameaças
4. **Extração Segura**: Descompactar com proteção contra traversal e compressão
5. **Detecção de PII**: Escanear conteúdo extraído para padrões PII brasileiros
6. **Resposta**: JSON com contagem e detalhes das detecções
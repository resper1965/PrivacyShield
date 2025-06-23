# PIIDetector

MVP do n.PIIdetector focado em ZIP e relatório de titulares (sem frontend).

## Requisitos

- Node.js 20+
- npm

## Instalação

```bash
npm install
```

## Uso

```bash
npm start
```

O servidor será iniciado na porta 8000.

## Endpoints

### POST /api/zip

Upload de arquivo ZIP para detecção de PII.

**Campo:** `file` (via multipart/form-data)

**Exemplo:**
```bash
curl -X POST -F "file=@exemplo.zip" http://localhost:8000/api/zip
```

### GET /api/report/titulares

Relatório de titulares com filtros opcionais.

**Parâmetros de query:**
- `domain`: Filtrar e-mails por domínio
- `cnpj`: Filtrar por CNPJ específico

**Exemplos:**
```bash
# Todos os titulares
curl http://localhost:8000/api/report/titulares

# Filtrar por domínio de e-mail
curl "http://localhost:8000/api/report/titulares?domain=empresa.com"

# Filtrar por CNPJ
curl "http://localhost:8000/api/report/titulares?cnpj=12.345.678/0001-90"
```

## Funcionalidades

- Detecção de PII em arquivos ZIP:
  - CPF (validação algorítmica)
  - CNPJ (validação algorítmica)
  - E-mail
  - Telefone (padrão brasileiro)
- Armazenamento em JSON local
- Relatórios filtrados por domínio e CNPJ
- Agrupamento por titular

## Estrutura do Projeto

```
src/
├── server.ts       # Servidor Express com rotas
├── detectPII.ts    # Lógica de detecção de PII
└── types/          # Definições de tipos TypeScript
```

## Dados

Os dados detectados são salvos em `detections.json` na raiz do projeto.
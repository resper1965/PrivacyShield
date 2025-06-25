# N.Crisis - Documentação Completa de APIs

**Versão**: 2.1  
**Base URL**: `https://monster.e-ness.com.br`  
**Port**: 5000

## Autenticação

Atualmente, as APIs não requerem autenticação. Em produção, considere implementar:
- API Keys
- JWT Tokens
- Rate Limiting

## Core APIs

### 1. Health Check

**Endpoint**: `GET /health`  
**Descrição**: Verifica status geral do sistema

```bash
curl -X GET https://monster.e-ness.com.br/health
```

**Resposta**:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-25T10:00:00.000Z",
  "services": {
    "database": "connected",
    "faiss": "initialized",
    "openai": "configured"
  }
}
```

### 2. Upload de Arquivos

**Endpoint**: `POST /api/v1/archives/upload`  
**Descrição**: Upload de arquivos ZIP para detecção PII

```bash
curl -X POST https://monster.e-ness.com.br/api/v1/archives/upload \
  -F "file=@document.zip"
```

**Resposta**:
```json
{
  "success": true,
  "message": "Arquivo processado com sucesso",
  "sessionId": "session_abc123",
  "totalFiles": 5,
  "totalDetections": 12,
  "processingTime": 2543
}
```

### 3. Relatórios de Detecções

**Endpoint**: `GET /api/v1/reports/detections`  
**Descrição**: Lista detecções com filtros opcionais

**Parâmetros**:
- `titular` (string): Filtrar por titular
- `documento` (string): Filtrar por tipo de documento
- `limit` (number): Limite de resultados (padrão: 100)
- `offset` (number): Offset para paginação

```bash
curl -X GET "https://monster.e-ness.com.br/api/v1/reports/detections?titular=João&limit=50"
```

**Resposta**:
```json
{
  "success": true,
  "detections": [
    {
      "id": 1,
      "titular": "João Silva",
      "documento": "CPF",
      "valor": "123.456.789-00",
      "arquivo": "dados.txt",
      "timestamp": "2025-06-25T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

## AI/ML APIs

### 4. Geração de Embeddings

**Endpoint**: `POST /api/v1/embeddings`  
**Descrição**: Gera embeddings OpenAI e armazena no banco

```bash
curl -X POST https://monster.e-ness.com.br/api/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{"text": "Documento contém CPF 123.456.789-00"}'
```

**Resposta**:
```json
{
  "success": true,
  "id": 123,
  "hash": "sha256_hash_here",
  "dimensions": 1536,
  "cached": false,
  "processingTime": 450
}
```

### 5. Busca por ID

**Endpoint**: `GET /api/v1/embeddings/:id`  
**Descrição**: Recupera embedding por ID

```bash
curl -X GET https://monster.e-ness.com.br/api/v1/embeddings/123
```

### 6. Health Check Embeddings

**Endpoint**: `GET /api/v1/embeddings/health`  
**Descrição**: Status do serviço de embeddings

```bash
curl -X GET https://monster.e-ness.com.br/api/v1/embeddings/health
```

## Busca Semântica

### 7. Busca Semântica FAISS

**Endpoint**: `POST /api/v1/search/semantic`  
**Descrição**: Busca documentos similares usando vetores

```bash
curl -X POST https://monster.e-ness.com.br/api/v1/search/semantic \
  -H "Content-Type: application/json" \
  -d '{"query": "CPF documento identificação", "k": 5}'
```

**Resposta**:
```json
{
  "success": true,
  "query": "CPF documento identificação",
  "results": [
    {
      "id": 2,
      "fileId": "embedding_2",
      "text": "Documento CPF 123.456.789-00 para análise",
      "distance": 0.751,
      "similarity": 0.571
    }
  ],
  "stats": {
    "totalResults": 5,
    "queryDimensions": 1536,
    "executionTime": 1750825648806
  }
}
```

### 8. Estatísticas FAISS

**Endpoint**: `GET /api/v1/search/stats`  
**Descrição**: Estatísticas do índice FAISS

```bash
curl -X GET https://monster.e-ness.com.br/api/v1/search/stats
```

**Resposta**:
```json
{
  "success": true,
  "stats": {
    "vectorCount": 150,
    "dimension": 1536,
    "isInitialized": true
  }
}
```

## Chat Inteligente

### 9. Chat com IA

**Endpoint**: `POST /api/v1/chat`  
**Descrição**: Chat contextual baseado em documentos processados

```bash
curl -X POST https://monster.e-ness.com.br/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "O que você sabe sobre CPF nos documentos?", "k": 3}'
```

**Resposta**:
```json
{
  "success": true,
  "query": "O que você sabe sobre CPF nos documentos?",
  "answer": "Com base nos documentos analisados, encontrei CPF 123.456.789-00 que é uma informação pessoal identificável (PII) protegida pela LGPD...",
  "sources": [
    {
      "id": 2,
      "fileId": "embedding_2",
      "similarity": 0.573
    }
  ],
  "stats": {
    "contextsUsed": 2,
    "totalSimilarityScore": 0.964,
    "averageSimilarity": 0.482,
    "queryDimensions": 1536
  }
}
```

### 10. Health Check Chat

**Endpoint**: `GET /api/v1/chat/health`  
**Descrição**: Status do serviço de chat

```bash
curl -X GET https://monster.e-ness.com.br/api/v1/chat/health
```

**Resposta**:
```json
{
  "status": "healthy",
  "service": "chat-api",
  "dependencies": {
    "openai_configured": true,
    "faiss_initialized": true,
    "vector_count": 150
  }
}
```

## Integração N8N

### 11. Webhook de Incidentes

**Endpoint**: `POST /api/v1/n8n/webhook/incident`  
**Descrição**: Recebe webhooks do N8N para registro de incidentes

```bash
curl -X POST https://monster.e-ness.com.br/api/v1/n8n/webhook/incident \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": 123,
    "incidentType": "PII_DETECTED",
    "severity": "HIGH",
    "description": "CPF encontrado em documento público"
  }'
```

**Resposta**:
```json
{
  "success": true,
  "message": "Incident webhook received successfully",
  "incidentId": "inc_abc123",
  "fileId": 123,
  "processedAt": "2025-06-25T10:00:00.000Z"
}
```

## Códigos de Status HTTP

| Código | Descrição |
|--------|-----------|
| 200 | Sucesso |
| 201 | Recurso criado |
| 400 | Requisição inválida |
| 401 | Não autorizado |
| 404 | Recurso não encontrado |
| 429 | Rate limit excedido |
| 500 | Erro interno do servidor |
| 503 | Serviço indisponível |

## Rate Limiting

**Limites atuais (por IP)**:
- APIs Core: 100 req/min
- APIs AI/ML: 20 req/min
- Upload: 10 req/min

## Exemplos de Integração

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Upload de arquivo
const uploadFile = async (filePath) => {
  const FormData = require('form-data');
  const fs = require('fs');
  
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  
  const response = await axios.post(
    'https://monster.e-ness.com.br/api/v1/archives/upload',
    form,
    { headers: form.getHeaders() }
  );
  
  return response.data;
};

// Chat com IA
const chatQuery = async (query) => {
  const response = await axios.post(
    'https://monster.e-ness.com.br/api/v1/chat',
    { query, k: 5 },
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  return response.data;
};
```

### Python

```python
import requests
import json

# Upload de arquivo
def upload_file(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            'https://monster.e-ness.com.br/api/v1/archives/upload',
            files=files
        )
    return response.json()

# Chat com IA
def chat_query(query, k=5):
    data = {'query': query, 'k': k}
    response = requests.post(
        'https://monster.e-ness.com.br/api/v1/chat',
        json=data,
        headers={'Content-Type': 'application/json'}
    )
    return response.json()
```

### cURL Scripts

```bash
#!/bin/bash
# upload_and_chat.sh

# Upload arquivo
echo "Uploading file..."
UPLOAD_RESULT=$(curl -s -X POST https://monster.e-ness.com.br/api/v1/archives/upload \
  -F "file=@$1")

echo "Upload result: $UPLOAD_RESULT"

# Aguardar processamento
sleep 5

# Fazer pergunta sobre o documento
echo "Querying AI..."
CHAT_RESULT=$(curl -s -X POST https://monster.e-ness.com.br/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Quais informações PII foram encontradas?", "k": 5}')

echo "AI Response: $CHAT_RESULT"
```

## Monitoramento

### Métricas Importantes

- **Latência de APIs**: < 500ms (core), < 2s (AI)
- **Taxa de sucesso**: > 99%
- **Uso de memória FAISS**: < 4GB
- **Conexões OpenAI**: Monitorar rate limits

### Logs Estruturados

```json
{
  "timestamp": "2025-06-25T10:00:00.000Z",
  "level": "info",
  "service": "chat-api",
  "endpoint": "/api/v1/chat",
  "method": "POST",
  "status": 200,
  "duration": 1250,
  "query": "CPF documento",
  "sources_found": 3
}
```

---

**N.Crisis API v2.1** - Documentação atualizada em June 25, 2025
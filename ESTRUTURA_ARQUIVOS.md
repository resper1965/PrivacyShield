# Estrutura de Arquivos - N.Crisis

## Organização das Pastas

### 📁 `/uploads/`
**Função**: Arquivos enviados via upload pela interface web
- Arquivos ZIP enviados através da aba "Upload ZIP"
- Arquivos individuais enviados via "Upload"
- Processamento temporário antes da análise

**Exemplo de uso**:
```
uploads/
├── documento_cliente_2025.zip
├── backup_sistema.zip
└── relatorio_mensal.pdf
```

### 📁 `/local_files/`
**Função**: Arquivos ZIP locais para análise
- ZIPs já existentes no servidor
- Arquivos importados de outras fontes
- Análise via aba "Local ZIP"

**Exemplo de uso**:
```
local_files/
├── dados_clientes_janeiro.zip
├── documentos_rh.zip
├── backup_financeiro.zip
└── arquivo_legado.zip
```

### 📁 `/shared_folders/`
**Função**: Pastas compartilhadas para análise recursiva
- Pastas de rede mapeadas
- Diretórios compartilhados
- Análise via "Análise de Pastas"

**Exemplo de uso**:
```
shared_folders/
├── documentos_corporativos/
│   ├── contratos/
│   ├── funcionarios/
│   └── clientes/
├── backup_sistema/
└── dados_externos/
```

### 📁 `/tmp/`
**Função**: Arquivos temporários durante processamento
- Extração de ZIPs
- Processamento de análises
- Cache temporário

### 📁 `/logs/`
**Função**: Logs do sistema
- Logs de processamento
- Logs de detecções
- Logs de erro

## Como Usar Cada Pasta

### Para ZIP Local (Aba "Local ZIP"):
1. Coloque arquivos ZIP na pasta `/local_files/`
2. Os arquivos aparecerão automaticamente na interface
3. Clique em "Analisar" para processar

### Para Análise de Pastas (Aba "Análise de Pastas"):
1. Crie estruturas em `/shared_folders/`
2. Digite o caminho na interface: `/shared_folders/nome_da_pasta`
3. Ou use caminhos de rede: `//servidor/compartilhamento`

### Para Upload Web:
1. Use a interface para upload direto
2. Arquivos vão para `/uploads/` automaticamente
3. Processamento imediato após upload

## Configuração para Produção

### Docker Volumes
No `docker-compose.yml`, as pastas são mapeadas:
```yaml
volumes:
  - ./uploads:/app/uploads
  - ./local_files:/app/local_files
  - ./shared_folders:/app/shared_folders
  - ./logs:/app/logs
```

### Permissões Recomendadas
```bash
# Criar estrutura
mkdir -p uploads local_files shared_folders tmp logs

# Definir permissões
chmod 755 uploads local_files shared_folders
chmod 750 tmp logs

# Para ambientes de produção
chown -R app:app uploads local_files shared_folders tmp logs
```

## Exemplos Práticos

### Cenário 1: Análise de ZIPs Existentes
```bash
# Copiar ZIPs para análise local
cp /backup/dados_janeiro.zip local_files/
cp /imports/*.zip local_files/
```

### Cenário 2: Configurar Pasta Compartilhada
```bash
# Criar estrutura de pastas
mkdir -p shared_folders/documentos_empresa
mkdir -p shared_folders/dados_clientes
mkdir -p shared_folders/backup_sistema

# Copiar arquivos existentes
cp -r /empresa/documentos/* shared_folders/documentos_empresa/
```

### Cenário 3: Montagem de Rede (Linux)
```bash
# Montar pasta de rede
mount -t cifs //servidor/dados shared_folders/dados_rede -o username=user

# Ou criar link simbólico
ln -s /mnt/network_drive shared_folders/rede_corporativa
```

## Segurança

- Todas as pastas são isoladas por container
- Análise em sandbox seguro
- Sem acesso a diretórios do sistema
- Logs de todas as operações

## Monitoramento

- Tamanho das pastas monitorado
- Logs de acesso registrados
- Alertas para pastas muito grandes
- Limpeza automática de arquivos temporários
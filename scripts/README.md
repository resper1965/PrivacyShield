# Scripts de Instalação e Gerenciamento

## Scripts Principais

### Instalação

- **`install-root.sh`** - Instalação completa como root (recomendado)
- **`install-completo.sh`** - Instalação como usuário normal
- **`install-fresh.sh`** - Instalação limpa
- **`cleanup-environment.sh`** - Limpeza do ambiente

### Deploy e VPS

- **`deploy-vps.sh`** - Deploy automatizado VPS
- **`manage-vps.sh`** - Gerenciamento VPS

### Correções e Manutenção

- **`fix-*.sh`** - Scripts de correção específicos
- **`debug-*.sh`** - Scripts de debugging

## Uso Recomendado

### Para Nova Instalação
```bash
wget -O install.sh https://raw.githubusercontent.com/resper1965/PrivacyShield/main/scripts/install-root.sh
chmod +x install.sh
./install.sh seudominio.com
```

### Para Gerenciamento
```bash
cd /opt/ncrisis
./manage.sh status
```

Todos os scripts incluem logging detalhado e verificação de erros.
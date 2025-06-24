# Instalação Rápida N.Crisis VPS

## Comando Único de Instalação

Para instalar o N.Crisis completo em uma VPS Ubuntu 22.04+:

```bash
# Método 1: Download e execução do script completo
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-vps-complete.sh -o install-vps.sh
chmod +x install-vps.sh
./install-vps.sh
```

**OU em uma linha:**
```bash
curl -fsSL https://raw.githubusercontent.com/resper1965/PrivacyShield/main/install-vps-complete.sh | sudo bash
```

## Pré-requisitos

1. **VPS Ubuntu 22.04+** com acesso root
2. **Domínio** `monster.e-ness.com.br` apontando para IP da VPS
3. **Token GitHub** ou credenciais para repositório privado

## O que será instalado

- ✅ Docker e Docker Compose
- ✅ Aplicação N.Crisis completa
- ✅ PostgreSQL + Redis + ClamAV
- ✅ Nginx com SSL (Let's Encrypt)
- ✅ Backup automático
- ✅ Monitoramento e health checks
- ✅ Firewall configurado

## Tempo estimado

- **Instalação completa**: 15-30 minutos
- **Configuração SSL**: +5-10 minutos (depende do DNS)

## Acesso final

- **HTTPS**: https://monster.e-ness.com.br
- **Health Check**: https://monster.e-ness.com.br/health

## Suporte

Para instalação manual ou troubleshooting, consulte:
- `INSTALACAO_VPS.md` - Guia completo
- `PASSO_A_PASSO_INSTALACAO.md` - Passo a passo detalhado
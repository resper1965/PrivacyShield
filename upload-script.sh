#!/bin/bash

# Script para fazer upload do install-local.sh para o servidor

echo "Copiando script para o servidor..."

# Usando scp (se tiver acesso SSH)
# scp install-local.sh root@monster.e-ness.com.br:/root/

# Ou mostrando o conteúdo para copiar manualmente
echo "Cole este script no servidor:"
echo "==============================="
cat install-local.sh
echo "==============================="
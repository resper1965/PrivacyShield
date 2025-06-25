#!/bin/bash

echo "Testando aplicação N.Crisis..."

echo "1. App local:"
curl -sf http://localhost:5000/health && echo "✓ OK" || echo "✗ FALHOU"

echo "2. Nginx status:"
systemctl is-active nginx && echo "✓ Nginx ativo" || echo "✗ Nginx inativo"

echo "3. Docker containers:"
docker compose ps

echo "4. App via Nginx:"
curl -sf http://monster.e-ness.com.br/health && echo "✓ HTTP OK" || echo "✗ HTTP falhou"

echo "5. App via HTTPS:"
curl -sf https://monster.e-ness.com.br/health && echo "✓ HTTPS OK" || echo "✗ HTTPS falhou"

echo "6. Logs recentes:"
docker compose logs app --tail=5
#!/usr/bin/env bash
cd "$(dirname "$0")"

# Si no existe dist, compilar
if [ ! -d "dist" ]; then
  echo "Compilando aplicación..."
  npm run build
fi

echo "Iniciando Docker Manager..."
npx electron --no-sandbox . "$@"

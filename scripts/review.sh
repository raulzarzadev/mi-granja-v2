#!/usr/bin/env bash
set -e

FAILED=0

echo "🔍 [1/5] Tests..."
turbo run test || { echo "❌ Tests fallaron"; FAILED=1; }
echo ""

echo "🔍 [2/5] Formato + organize imports (Biome)..."
biome check --write . || { echo "❌ Formato falló"; FAILED=1; }
echo ""

echo "🔍 [3/5] Tipos (TypeScript)..."
turbo run type-check || { echo "❌ Type-check falló"; FAILED=1; }
echo ""

echo "🔍 [4/5] Lint (Biome)..."
biome check --diagnostic-level=error . || { echo "❌ Lint falló"; FAILED=1; }
echo ""

echo "🔍 [5/5] Contratos y documentación del asistente..."
pnpm check:assistant-docs || { echo "❌ Documentación del asistente pendiente"; FAILED=1; }
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 Review completo. Todo OK."
else
  echo "💥 Hay errores. Revisa la salida anterior."
  exit 1
fi

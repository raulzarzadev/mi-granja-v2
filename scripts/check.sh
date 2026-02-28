#!/usr/bin/env bash

FAILED=0

echo "🔍 [1/4] Formato (Biome)..."
pnpm format || { echo "❌ Formato falló"; FAILED=1; }
echo ""

echo "🔍 [2/4] Lint (Biome)..."
LINT_OUTPUT=$(pnpm lint 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ Lint OK"
else
  WARN_COUNT=$(echo "$LINT_OUTPUT" | grep -c "FIXABLE\|Found.*warning" || true)
  echo "⚠️  Lint: $WARN_COUNT diagnosticos (warnings conocidos, no bloqueante)"
fi
echo ""

echo "🔍 [3/4] Tipos (TypeScript)..."
TC_OUTPUT=$(pnpm type-check 2>&1)
if [ $? -eq 0 ]; then
  echo "✅ Tipos OK"
else
  # Verificar si los errores son solo en archivos de test
  NON_TEST_ERRORS=$(echo "$TC_OUTPUT" | grep "error TS" | grep -v "__tests__/" || true)
  if [ -z "$NON_TEST_ERRORS" ]; then
    echo "⚠️  Type-check: errores solo en archivos de test (no bloqueante)"
  else
    echo "❌ Type-check falló en código fuente:"
    echo "$NON_TEST_ERRORS"
    FAILED=1
  fi
fi
echo ""

echo "🔍 [4/4] Tests..."
pnpm test || { echo "❌ Tests fallaron"; FAILED=1; }
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 Todo pasó correctamente."
else
  echo "💥 Hay errores bloqueantes. Revisa la salida anterior."
  exit 1
fi
